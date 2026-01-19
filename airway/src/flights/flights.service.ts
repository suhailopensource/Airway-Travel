import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Flight, FlightStatus } from './entities/flight.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { SearchFlightsOpenSearchDto } from './dto/search-flights-opensearch.dto';
import { FlightPassengerListDto, PassengerInfoDto } from './dto/passenger-list.dto';
import { OpenSearchService } from '../opensearch/opensearch.service';
import { Role } from '../common/enums/role.enum';
import { BookingStatus } from '../bookings/entities/booking.entity';
import { TimeValidationService } from '../common/services/time-validation.service';
import { FlightLifecycleService } from '../common/services/flight-lifecycle.service';
import { FlightSchedulingConflictException } from '../common/exceptions/business.exceptions';
import { RedisService } from '../redis/redis.service';
import { 
  getFlightSearchCacheKey, 
  getFlightAvailabilityCacheKey, 
  getFlightSearchCachePattern, 
  getFlightAvailabilityCachePattern,
  getFlightsByProviderCacheKey,
  getFlightBookingsCacheKey,
  getFlightPassengersCacheKey,
  getProviderDashboardCacheKey,
} from '../redis/cache-keys';
import { CACHE_TTL } from '../redis/cache-config';

@Injectable()
export class FlightsService {
  private readonly OPENSEARCH_INDEX = 'flights';

  constructor(
    @InjectModel(Flight)
    private flightModel: typeof Flight,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Booking)
    private bookingModel: typeof Booking,
    private openSearchService: OpenSearchService,
    private timeValidationService: TimeValidationService,
    private flightLifecycleService: FlightLifecycleService,
    private redisService: RedisService,
  ) {
    this.initializeOpenSearchIndex();
  }

  private async initializeOpenSearchIndex() {
    await this.openSearchService.createIndex(this.OPENSEARCH_INDEX, {
      properties: {
        id: { type: 'keyword' },
        flightNumber: { 
          type: 'text',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        source: { 
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        destination: { 
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        departureTime: { type: 'date' },
        providerName: { 
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        providerId: { type: 'keyword' },
        status: { type: 'keyword' },
        availableSeats: { type: 'integer' },
        price: { type: 'float' },
      },
    });
  }

  private async indexFlightWithProvider(flight: Flight): Promise<void> {
    // Get provider information
    const provider = await this.userModel.findByPk(flight.providerId, {
      attributes: ['id', 'name', 'email'],
    });

    const document = {
      id: flight.id,
      flightNumber: flight.flightNumber,
      source: flight.source,
      destination: flight.destination,
      departureTime: flight.departureTime.toISOString(),
      providerName: provider?.name || 'Unknown',
      providerId: flight.providerId,
      status: flight.status,
      availableSeats: flight.availableSeats,
      price: flight.price,
    };

    await this.openSearchService.indexDocument(
      this.OPENSEARCH_INDEX,
      flight.id,
      document,
    );
  }

  async create(createFlightDto: CreateFlightDto, userId: string): Promise<Flight> {
    // Verify user is AIRWAY_PROVIDER
    const user = await this.userModel.findByPk(userId);
    if (!user || user.role !== Role.AIRWAY_PROVIDER) {
      throw new ForbiddenException('Only AIRWAY_PROVIDER can create flights');
    }

    // Validate totalSeats > 0
    if (createFlightDto.totalSeats <= 0) {
      throw new BadRequestException('Total seats must be greater than 0');
    }

    const departureTime = new Date(createFlightDto.departureTime);
    const arrivalTime = new Date(createFlightDto.arrivalTime);

    // Time-based validations using centralized service
    this.timeValidationService.validateDepartureTimeInFuture(departureTime);
    this.timeValidationService.validateArrivalAfterDeparture(departureTime, arrivalTime);

    // Use transaction for concurrency-safe conflict detection
    const transaction: Transaction = await this.flightModel.sequelize.transaction();

    try {
      /**
       * Check for scheduling conflicts: same flight number + same provider + overlapping schedule
       * 
       * Overlap Detection Logic:
       * Two flights overlap if their time ranges intersect.
       * For existing flight [dep1, arr1] and new flight [dep2, arr2]:
       * They overlap if: dep2 < arr1 AND arr2 > dep1
       * 
       * This means:
       * - New flight starts before existing flight ends (dep2 < arr1)
       * - New flight ends after existing flight starts (arr2 > dep1)
       * 
       * Why same flight number only?
       * - Different flight numbers can share the same aircraft/crew at different times
       * - Same flight number represents the same service route/identifier
       * - Real-world: Airlines reuse flight numbers on different days, but not simultaneously
       * 
       * Why same provider only?
       * - Different providers operate independently
       * - Flight numbers are provider-specific identifiers
       * - Provider A's "AI-101" is different from Provider B's "AI-101"
       */
      const conflictingFlight = await this.flightModel.findOne({
        where: {
          flightNumber: createFlightDto.flightNumber, // Same flight number
          providerId: userId, // Same provider
          status: {
            [Op.ne]: FlightStatus.CANCELLED, // Exclude cancelled flights (they don't block scheduling)
          },
          // Overlap condition: existingDepartureTime < newArrivalTime AND existingArrivalTime > newDepartureTime
          departureTime: {
            [Op.lt]: arrivalTime, // existingDepartureTime < newArrivalTime (new ends after existing starts)
          },
          arrivalTime: {
            [Op.gt]: departureTime, // existingArrivalTime > newDepartureTime (new starts before existing ends)
          },
        },
        lock: true, // SELECT FOR UPDATE: Prevents concurrent creation of conflicting flights
        transaction,
      });

      if (conflictingFlight) {
        await transaction.rollback();
        throw new FlightSchedulingConflictException(createFlightDto.flightNumber);
      }

      // Create flight within transaction
      const flight = await this.flightModel.create(
        {
          flightNumber: createFlightDto.flightNumber,
          providerId: userId,
          source: createFlightDto.source,
          destination: createFlightDto.destination,
          departureTime,
          arrivalTime,
          totalSeats: createFlightDto.totalSeats,
          availableSeats: createFlightDto.totalSeats,
          price: createFlightDto.price,
          status: FlightStatus.SCHEDULED, // Default status is SCHEDULED
        },
        { transaction },
      );

      await transaction.commit();

      // Index in OpenSearch with provider name (outside transaction for performance)
      await this.indexFlightWithProvider(flight);

      // Invalidate caches: new flight may appear in search results
      await this.invalidateFlightCaches(flight.id, userId);

      return flight;
    } catch (error) {
      // Only rollback if it's not the scheduling conflict exception (which already rolled back)
      // and if the transaction hasn't been committed
      if (!(error instanceof FlightSchedulingConflictException)) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          // Transaction may already be rolled back or committed, ignore
        }
      }
      throw error;
    }
  }

  async findAll(): Promise<Flight[]> {
    return this.flightModel.findAll({ 
      where: {
        status: FlightStatus.SCHEDULED,
      },
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['departureTime', 'ASC']],
    });
  }

  async findByProvider(userId: string): Promise<Flight[]> {
    // Check cache first
    const cacheKey = getFlightsByProviderCacheKey(userId);
    const cached = await this.redisService.getJSON<Flight[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const flights = await this.flightModel.findAll({
      where: { providerId: userId },
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['departureTime', 'DESC']], // Most recent flights first
    });

    // Cache the result
    await this.redisService.setJSON(cacheKey, flights, CACHE_TTL.FLIGHTS_BY_PROVIDER);

    return flights;
  }

  async findByProviderId(providerId: string): Promise<Flight[]> {
    // Verify provider exists and is AIRWAY_PROVIDER
    const provider = await this.userModel.findOne({
      where: { id: providerId, role: Role.AIRWAY_PROVIDER },
    });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${providerId} not found or is not an AIRWAY_PROVIDER`);
    }

    // Check cache first
    const cacheKey = getFlightsByProviderCacheKey(providerId);
    const cached = await this.redisService.getJSON<Flight[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Get all scheduled flights for this provider (only future flights with available seats)
    const now = new Date();
    const flights = await this.flightModel.findAll({
      where: {
        providerId,
        status: FlightStatus.SCHEDULED,
        departureTime: { [Op.gte]: now },
        availableSeats: { [Op.gt]: 0 },
      },
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['departureTime', 'ASC']],
    });

    // Cache the result
    await this.redisService.setJSON(cacheKey, flights, CACHE_TTL.FLIGHTS_BY_PROVIDER);

    return flights;
  }

  async findOne(id: string): Promise<Flight> {
    const flight = await this.flightModel.findByPk(id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });
    if (!flight) {
      throw new NotFoundException(`Flight with ID ${id} not found`);
    }
    return flight;
  }

  async getAvailability(flightId: string) {
    // Check cache first
    const cacheKey = getFlightAvailabilityCacheKey(flightId);
    const cached = await this.redisService.getJSON<any>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const flight = await this.findOne(flightId);

    const bookedSeats = flight.totalSeats - flight.availableSeats;
    const now = this.timeValidationService.getCurrentTime();
    const isAvailable = 
      flight.status === FlightStatus.SCHEDULED && 
      flight.availableSeats > 0 &&
      flight.departureTime > now;

    const availability = {
      flightId: flight.id,
      flightNumber: flight.flightNumber,
      totalSeats: flight.totalSeats,
      availableSeats: flight.availableSeats,
      bookedSeats,
      status: flight.status,
      isAvailable,
      departureTime: flight.departureTime,
      source: flight.source,
      destination: flight.destination,
    };

    // Cache the result with short TTL (30 seconds) for real-time accuracy
    await this.redisService.setJSON(cacheKey, availability, CACHE_TTL.FLIGHT_AVAILABILITY);

    return availability;
  }

  async getFlightBookings(flightId: string, providerId: string): Promise<Booking[]> {
    const flight = await this.findOne(flightId);

    // Verify that the flight belongs to the provider
    if (flight.providerId !== providerId) {
      throw new ForbiddenException('You can only view bookings for your own flights');
    }

    // Check cache first
    const cacheKey = getFlightBookingsCacheKey(flightId);
    const cached = await this.redisService.getJSON<Booking[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const bookings = await this.bookingModel.findAll({
      where: { flightId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Cache the result
    await this.redisService.setJSON(cacheKey, bookings, CACHE_TTL.FLIGHT_BOOKINGS);

    return bookings;
  }

  async getFlightPassengers(flightId: string, providerId: string): Promise<FlightPassengerListDto> {
    // Find flight and verify ownership
    const flight = await this.findOne(flightId);

    // Ownership validation: Only provider can view passengers for their flights
    if (flight.providerId !== providerId) {
      throw new ForbiddenException('You can only view passengers for your own flights');
    }

    // Check cache first
    const cacheKey = getFlightPassengersCacheKey(flightId);
    const cached = await this.redisService.getJSON<FlightPassengerListDto>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Get all bookings for this flight with user information
    const bookings = await this.bookingModel.findAll({
      where: { flightId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    // Aggregate passengers by userId
    const passengerMap = new Map<string, {
      userId: string;
      name: string;
      email: string;
      totalSeats: number;
      totalAmount: number;
      firstBookingDate: Date;
      bookingCount: number;
      statuses: Set<BookingStatus>;
    }>();

    bookings.forEach((booking) => {
      const userId = booking.userId;
      const user = booking.user as User;

      if (!passengerMap.has(userId)) {
        passengerMap.set(userId, {
          userId,
          name: user.name,
          email: user.email,
          totalSeats: 0,
          totalAmount: 0,
          firstBookingDate: booking.bookedAt || booking.createdAt,
          bookingCount: 0,
          statuses: new Set(),
        });
      }

      const passenger = passengerMap.get(userId);
      
      // Only count non-cancelled bookings in totals
      if (booking.status !== BookingStatus.CANCELLED) {
        passenger.totalSeats += booking.seatCount;
        passenger.totalAmount += Number(booking.totalPrice);
      }
      
      // Always count booking for bookingCount (to show total bookings including cancelled)
      passenger.bookingCount += 1;
      passenger.statuses.add(booking.status);

      // Update first booking date if this booking is earlier
      const bookingDate = booking.bookedAt || booking.createdAt;
      if (bookingDate < passenger.firstBookingDate) {
        passenger.firstBookingDate = bookingDate;
      }
    });

    // Convert map to array and create PassengerInfoDto
    // Filter out passengers who only have cancelled bookings (no active bookings)
    const passengers: PassengerInfoDto[] = Array.from(passengerMap.values())
      .filter((p) => {
        // Only include passengers who have at least one non-cancelled booking
        return !p.statuses.has(BookingStatus.CANCELLED) || p.statuses.size > 1;
      })
      .map((p) => ({
        userId: p.userId,
        name: p.name,
        email: p.email,
        totalSeats: p.totalSeats,
        totalAmount: p.totalAmount,
        firstBookingDate: p.firstBookingDate,
        bookingCount: p.bookingCount,
        // If all bookings have same status, use that; otherwise use CONFIRMED as default
        // If passenger has cancelled bookings but also active ones, show CONFIRMED
        status: p.statuses.size === 1 
          ? Array.from(p.statuses)[0] 
          : (p.statuses.has(BookingStatus.CONFIRMED) ? BookingStatus.CONFIRMED : BookingStatus.CANCELLED),
      }));

    // Calculate totals (only from non-cancelled bookings)
    const totalSeatsBooked = passengers.reduce((sum, p) => sum + p.totalSeats, 0);
    const totalRevenue = passengers.reduce((sum, p) => sum + p.totalAmount, 0);

    const passengerList: FlightPassengerListDto = {
      flightId: flight.id,
      flightNumber: flight.flightNumber,
      source: flight.source,
      destination: flight.destination,
      departureTime: flight.departureTime,
      totalPassengers: passengers.length,
      totalSeatsBooked,
      totalRevenue,
      passengers,
    };

    // Cache the result
    await this.redisService.setJSON(cacheKey, passengerList, CACHE_TTL.FLIGHT_PASSENGERS);

    return passengerList;
  }

  async update(
    id: string,
    updateFlightDto: UpdateFlightDto,
    userId: string,
    userRole: Role,
  ): Promise<Flight> {
    const flight = await this.findOne(id);

    // Verify that the flight belongs to the provider
    if (userRole !== Role.AIRWAY_PROVIDER || flight.providerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this flight');
    }

    // Prevent editing completed, in-air, or cancelled flights
    if (flight.status === FlightStatus.COMPLETED) {
      throw new BadRequestException('Cannot update a completed flight. The flight has already arrived.');
    }

    if (flight.status === FlightStatus.IN_AIR) {
      throw new BadRequestException('Cannot update a flight that is currently in air.');
    }

    if (flight.status === FlightStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled flight.');
    }

    // Prepare update data with converted dates
    const updateData: any = { ...updateFlightDto };

    if (updateFlightDto.departureTime) {
      updateData.departureTime = new Date(updateFlightDto.departureTime);
    }

    if (updateFlightDto.arrivalTime) {
      updateData.arrivalTime = new Date(updateFlightDto.arrivalTime);
    }

    // Validate dates if either is being updated
    if (updateData.departureTime || updateData.arrivalTime) {
      const departureTime = updateData.departureTime || flight.departureTime;
      const arrivalTime = updateData.arrivalTime || flight.arrivalTime;

      if (arrivalTime <= departureTime) {
        throw new BadRequestException('Arrival time must be after departure time');
      }
    }

    await flight.update(updateData);

    // Reload flight to get updated data
    await flight.reload();

    // Update in OpenSearch with provider name
    await this.indexFlightWithProvider(flight);

    // Invalidate caches: flight changes may affect search results and availability
    await this.invalidateFlightCaches(flight.id, flight.providerId);

    return flight;
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const flight = await this.findOne(id);

    // Verify that the flight belongs to the provider
    if (userRole !== Role.AIRWAY_PROVIDER || flight.providerId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this flight');
    }

    // Validate flight can be cancelled (before departure)
    this.timeValidationService.validateFlightCancellable(flight.departureTime);

    // Use transaction for atomic cancellation
    const transaction: Transaction = await this.flightModel.sequelize.transaction();

    try {
      // Mark flight as cancelled
      await flight.update({ status: FlightStatus.CANCELLED }, { transaction });

      // Cancel all CONFIRMED bookings for this flight
      await this.bookingModel.update(
        { status: BookingStatus.CANCELLED },
        {
          where: {
            flightId: id,
            status: BookingStatus.CONFIRMED,
          },
          transaction,
        },
      );

      // Restore available seats
      await flight.update(
        { availableSeats: flight.totalSeats },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // Reload flight to get updated data
    await flight.reload();

    // Remove from OpenSearch since flight is cancelled (not searchable)
    // If flight still exists in DB but is cancelled, we remove it from search index
    try {
      await this.openSearchService.deleteDocument(this.OPENSEARCH_INDEX, id);
    } catch (error) {
      // Log error but don't fail the operation if OpenSearch deletion fails
      // Document might not exist in OpenSearch
      console.warn(`Failed to delete flight ${id} from OpenSearch:`, error.message);
    }

    // Invalidate caches: cancelled flight should not appear in search results
    await this.invalidateFlightCaches(flight.id, flight.providerId);
  }

  /**
   * Invalidate all caches related to a flight
   * - Flight search caches (any search may have included this flight)
   * - Flight availability cache (specific to this flight)
   * - Flights by provider cache
   * - Provider dashboard cache
   * - Flight bookings cache
   * - Flight passengers cache
   */
  private async invalidateFlightCaches(flightId: string, providerId?: string): Promise<void> {
    // Invalidate all flight search caches (any search query may be affected)
    await this.redisService.deletePattern(getFlightSearchCachePattern());

    // Invalidate specific flight availability cache
    const availabilityKey = getFlightAvailabilityCacheKey(flightId);
    await this.redisService.del(availabilityKey);

    // Invalidate flights by provider cache if providerId is available
    if (providerId) {
      const flightsByProviderKey = getFlightsByProviderCacheKey(providerId);
      await this.redisService.del(flightsByProviderKey);

      // Invalidate provider dashboard cache
      const providerDashboardKey = getProviderDashboardCacheKey(providerId);
      await this.redisService.del(providerDashboardKey);
    }

    // Invalidate flight bookings cache
    const flightBookingsKey = getFlightBookingsCacheKey(flightId);
    await this.redisService.del(flightBookingsKey);

    // Invalidate flight passengers cache
    const flightPassengersKey = getFlightPassengersCacheKey(flightId);
    await this.redisService.del(flightPassengersKey);
  }

  async search(searchDto: SearchFlightsDto): Promise<Flight[]> {
    // Check cache first
    const cacheKey = getFlightSearchCacheKey({
      source: searchDto.source || searchDto.origin,
      destination: searchDto.destination,
      departureDate: searchDto.departureDate,
    });
    
    const cached = await this.redisService.getJSON<Flight[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - proceed with search
    // Build database query conditions
    const where: any = {
      status: FlightStatus.SCHEDULED,
    };
    const now = new Date();

    // Use source (preferred) or origin (backward compatibility)
    const source = searchDto.source || searchDto.origin;
    if (source) {
      where.source = { [Op.iLike]: `%${source}%` }; // Case-insensitive partial match
    }

    if (searchDto.destination) {
      where.destination = { [Op.iLike]: `%${searchDto.destination}%` }; // Case-insensitive partial match
    }

    // Filter by departure date if provided
    if (searchDto.departureDate) {
      const startDate = new Date(searchDto.departureDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(searchDto.departureDate);
      endDate.setHours(23, 59, 59, 999);

      where.departureTime = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };
    } else {
      // Only show future flights if no date specified
      where.departureTime = {
        [Op.gte]: now,
      };
    }

    // Only show flights with available seats
    where.availableSeats = {
      [Op.gt]: 0,
    };

    // Try OpenSearch first for better search experience
    try {
      const opensearchQuery: any = {
        query: {
          bool: {
            must: [],
            filter: [
              { term: { status: FlightStatus.SCHEDULED } },
              { range: { availableSeats: { gt: 0 } } },
            ],
          },
        },
      };

      if (source) {
        opensearchQuery.query.bool.must.push({
          match: { 
            source: {
              query: source,
              fuzziness: 'AUTO',
            },
          },
        });
      }

      if (searchDto.destination) {
        opensearchQuery.query.bool.must.push({
          match: { 
            destination: {
              query: searchDto.destination,
              fuzziness: 'AUTO',
            },
          },
        });
      }

      if (searchDto.departureDate) {
        const startDate = new Date(searchDto.departureDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(searchDto.departureDate);
        endDate.setHours(23, 59, 59, 999);

        opensearchQuery.query.bool.filter.push({
          range: {
            departureTime: {
              gte: startDate.toISOString(),
              lte: endDate.toISOString(),
            },
          },
        });
      } else {
        // Only future flights
        opensearchQuery.query.bool.filter.push({
          range: {
            departureTime: {
              gte: now.toISOString(),
            },
          },
        });
      }

      const result = await this.openSearchService.search(this.OPENSEARCH_INDEX, opensearchQuery);
      const hits = result.body?.hits?.hits || result.hits?.hits || [];
      const flightIds = hits.map((hit: any) => hit._id || hit._source?.id).filter(Boolean);

      if (flightIds.length > 0) {
        // Get flights from database with provider info
        const flights = await this.flightModel.findAll({
          where: { 
            id: { [Op.in]: flightIds },
            availableSeats: { [Op.gt]: 0 },
            status: FlightStatus.SCHEDULED,
          },
          include: [
            {
              model: User,
              as: 'provider',
              attributes: ['id', 'name', 'email'],
            },
          ],
          order: [['departureTime', 'ASC']],
        });

        // Filter to ensure available seats
        const filteredFlights = flights.filter(flight => flight.availableSeats > 0);
        
        // Cache the results
        await this.redisService.setJSON(cacheKey, filteredFlights, CACHE_TTL.FLIGHT_SEARCH);
        
        return filteredFlights;
      }

      // If OpenSearch returns no results, fall through to database search
    } catch (error) {
      // OpenSearch failed, use database search
      console.warn('OpenSearch search failed, falling back to database:', error.message);
    }

    // Database search fallback
    const flights = await this.flightModel.findAll({
      where,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['departureTime', 'ASC']],
    });

    // Cache the results
    await this.redisService.setJSON(cacheKey, flights, CACHE_TTL.FLIGHT_SEARCH);

    return flights;
  }

  async searchWithOpenSearch(searchDto: SearchFlightsOpenSearchDto | any): Promise<{ flights: Flight[]; pagination: any }> {
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 10;
    const from = (page - 1) * limit;

    // Support backward compatibility: convert 'origin' to 'source' if provided
    if (!searchDto.source && searchDto.origin) {
      searchDto.source = searchDto.origin;
    }

    // Check cache first
    const cacheKey = getFlightSearchCacheKey({
      source: searchDto.source,
      destination: searchDto.destination,
      departureDate: searchDto.departureDate,
      providerName: searchDto.providerName,
      flightNumber: searchDto.flightNumber,
      page,
      limit,
    });

    const cached = await this.redisService.getJSON<{ flights: Flight[]; pagination: any }>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();

    // Build OpenSearch query
    const query: any = {
      query: {
        bool: {
          must: [],
          filter: [
              { term: { status: FlightStatus.SCHEDULED } },
            { range: { availableSeats: { gt: 0 } } },
            { range: { departureTime: { gte: now.toISOString() } } },
          ],
        },
      },
      from,
      size: limit,
      sort: [{ departureTime: { order: 'asc' } }],
    };

    // Add source filter
    if (searchDto.source) {
      query.query.bool.must.push({
        match: {
          source: {
            query: searchDto.source,
            fuzziness: 'AUTO',
          },
        },
      });
    }

    // Add destination filter
    if (searchDto.destination) {
      query.query.bool.must.push({
        match: {
          destination: {
            query: searchDto.destination,
            fuzziness: 'AUTO',
          },
        },
      });
    }

    // Add provider name filter
    if (searchDto.providerName) {
      query.query.bool.must.push({
        match: {
          providerName: {
            query: searchDto.providerName,
            fuzziness: 'AUTO',
          },
        },
      });
    }

    // Add flight number filter (exact match)
    if (searchDto.flightNumber) {
      query.query.bool.must.push({
        term: {
          'flightNumber.keyword': searchDto.flightNumber,
        },
      });
    }

    // Add departure date filter
    if (searchDto.departureDate) {
      const startDate = new Date(searchDto.departureDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(searchDto.departureDate);
      endDate.setHours(23, 59, 59, 999);

      query.query.bool.filter.push({
        range: {
          departureTime: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
        },
      });
    }

    try {
      const searchResult = await this.openSearchService.search(this.OPENSEARCH_INDEX, query);
      const body = searchResult.body || searchResult;
      const hits = body.hits?.hits || [];
      const total = body.hits?.total?.value || body.hits?.total || 0;

      // Get flight IDs from OpenSearch results
      const flightIds = hits.map((hit: any) => hit._id || hit._source?.id).filter(Boolean);

      // Fetch full flight data from database
      let flights: Flight[] = [];
      if (flightIds.length > 0) {
        flights = await this.flightModel.findAll({
          where: {
            id: { [Op.in]: flightIds },
            status: FlightStatus.SCHEDULED,
            availableSeats: { [Op.gt]: 0 },
          },
          include: [
            {
              model: User,
              as: 'provider',
              attributes: ['id', 'name', 'email'],
            },
          ],
          order: [['departureTime', 'ASC']],
        });
      }

      const result = {
        flights,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };

      // Cache the results
      await this.redisService.setJSON(cacheKey, result, CACHE_TTL.FLIGHT_SEARCH);

      return result;
    } catch (error) {
      console.error('OpenSearch search failed:', error);
      // Fallback to empty results
      const fallbackResult = {
        flights: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      // Cache empty results with shorter TTL (1 minute) since this is an error case
      await this.redisService.setJSON(cacheKey, fallbackResult, 60);

      return fallbackResult;
    }
  }

  /**
   * Cleanup orphaned documents from OpenSearch
   * Removes documents that exist in OpenSearch but not in the database
   * 
   * This is useful for:
   * - Removing documents for flights that were deleted from the database
   * - Syncing OpenSearch with database state
   * - Cleaning up after manual database operations
   * 
   * @returns Object with cleanup statistics
   */
  async cleanupOrphanedOpenSearchDocuments(): Promise<{
    totalInOpenSearch: number;
    totalInDatabase: number;
    orphanedCount: number;
    deletedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      // Get all document IDs from OpenSearch
      const openSearchIds = await this.openSearchService.getAllDocumentIds(
        this.OPENSEARCH_INDEX,
      );

      if (openSearchIds.length === 0) {
        return {
          totalInOpenSearch: 0,
          totalInDatabase: 0,
          orphanedCount: 0,
          deletedCount: 0,
          errors: [],
        };
      }

      // Get all flight IDs from database
      const dbFlights = await this.flightModel.findAll({
        attributes: ['id'],
        raw: true,
      });
      const dbFlightIds = new Set(dbFlights.map((f: any) => f.id));

      // Find orphaned documents (exist in OpenSearch but not in database)
      const orphanedIds = openSearchIds.filter((id) => !dbFlightIds.has(id));

      // Delete orphaned documents
      for (const id of orphanedIds) {
        try {
          await this.openSearchService.deleteDocument(this.OPENSEARCH_INDEX, id);
          deletedCount++;
        } catch (error: any) {
          errors.push(`Failed to delete document ${id}: ${error.message}`);
        }
      }

      return {
        totalInOpenSearch: openSearchIds.length,
        totalInDatabase: dbFlightIds.size,
        orphanedCount: orphanedIds.length,
        deletedCount,
        errors,
      };
    } catch (error: any) {
      errors.push(`Cleanup failed: ${error.message}`);
      throw new Error(`Failed to cleanup orphaned documents: ${error.message}`);
    }
  }
}
