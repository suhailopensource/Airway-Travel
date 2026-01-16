import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction, Op } from 'sequelize';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Flight, FlightStatus } from '../flights/entities/flight.entity';
import { User } from '../users/entities/user.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BoardBookingDto } from './dto/board-booking.dto';
import { RedisService } from '../redis/redis.service';
import { TimeValidationService } from '../common/services/time-validation.service';
import { InsufficientSeatsException } from '../common/exceptions/business.exceptions';
import { 
  getFlightAvailabilityCacheKey, 
  getBookingLockKey,
  getBookingsByUserCacheKey,
  getUserDashboardCacheKey,
  getFlightBookingsCacheKey,
  getFlightPassengersCacheKey,
  getProviderDashboardCacheKey,
} from '../redis/cache-keys';
import { CACHE_TTL } from '../redis/cache-config';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking)
    private bookingModel: typeof Booking,
    @InjectModel(Flight)
    private flightModel: typeof Flight,
    @InjectModel(User)
    private userModel: typeof User,
    private redisService: RedisService,
    private timeValidationService: TimeValidationService,
  ) {}

  async create(createBookingDto: CreateBookingDto, userId: string): Promise<Booking> {
    const { flightId, seatCount } = createBookingDto;

    // Validation: Cannot book if seatCount is 0 or negative
    if (seatCount <= 0) {
      throw new BadRequestException('Seat count must be greater than 0');
    }

    // Acquire Redis distributed lock for this flight to prevent race conditions
    // This is the first layer of protection - prevents concurrent booking attempts
    const lockKey = getBookingLockKey(flightId);
    const lockAcquired = await this.redisService.acquireLock(lockKey, CACHE_TTL.BOOKING_LOCK);

    if (!lockAcquired) {
      throw new BadRequestException('Flight is currently being booked. Please try again.');
    }

    try {
      // Use database transaction to ensure atomicity
      // This is the second layer of protection - ensures all-or-nothing operations
      const transaction: Transaction = await this.bookingModel.sequelize.transaction();

      try {
        // SELECT ... FOR UPDATE: Lock the flight row for exclusive access
        // This prevents other transactions from reading/writing this flight until we commit
        const flight = await this.flightModel.findByPk(flightId, {
          lock: true, // SELECT ... FOR UPDATE
          transaction,
        });

        if (!flight) {
          throw new NotFoundException(`Flight with ID ${flightId} not found`);
        }

        // Re-check time inside transaction (server time, not client time)
        const now = this.timeValidationService.getCurrentTime();
        
        // Time-based validation: Cannot book after departure
        if (now >= flight.departureTime) {
          throw new BadRequestException('Booking is not allowed after flight departure.');
        }

        // Flight bookability validation (status + time checks)
        this.timeValidationService.validateFlightBookable(flight);

        // Atomic validation: Check available seats while row is locked
        // Cannot book if availableSeats = 0
        if (flight.availableSeats === 0) {
          throw new BadRequestException('No seats available. Flight is fully booked.');
        }

        // Validate seat count atomically
        if (flight.availableSeats < seatCount) {
          throw new InsufficientSeatsException(flight.availableSeats, seatCount);
        }

        // Calculate total price
        const totalPrice = flight.price * seatCount;

        // Get provider information to store with booking
        const provider = await this.userModel.findByPk(flight.providerId, {
          attributes: ['id', 'name', 'email'],
          transaction,
        });

        if (!provider) {
          throw new NotFoundException('Flight provider not found');
        }

        // Create booking record atomically within transaction
        const booking = await this.bookingModel.create(
          {
            userId,
            flightId,
            providerId: provider.id,
            providerName: provider.name,
            providerEmail: provider.email,
            seatCount,
            totalPrice,
            status: BookingStatus.CONFIRMED,
            bookedAt: new Date(),
          },
          { transaction },
        );

        // Update flight available seats atomically
        // This happens within the same transaction, so it's atomic with booking creation
        await flight.update(
          {
            availableSeats: flight.availableSeats - seatCount,
          },
          { transaction },
        );

        // Commit transaction - all changes become visible atomically
        await transaction.commit();

        // Invalidate related caches (flight.providerId is available from the locked flight)
        await this.invalidateBookingRelatedCaches(userId, flightId, flight.providerId);

        return booking;
      } catch (error) {
        // Rollback transaction on any error - ensures consistency
        await transaction.rollback();
        throw error;
      }
    } finally {
      // Always release the Redis lock, even if transaction fails
      await this.redisService.releaseLock(lockKey);
    }
  }

  async findAll(userId?: string): Promise<Booking[]> {
    // If userId is provided, check cache first
    if (userId) {
      const cacheKey = getBookingsByUserCacheKey(userId);
      const cached = await this.redisService.getJSON<Booking[]>(cacheKey);
      
      if (cached) {
        return cached;
      }
    }

    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    const bookings = await this.bookingModel.findAll({
      where,
      include: [
        { model: Flight, as: 'flight' },
        { model: User, as: 'user' },
        { 
          model: User, 
          as: 'provider',
          attributes: ['id', 'name', 'email'],
          required: false, // Allow null for backward compatibility
        },
      ],
      order: [['createdAt', 'DESC']], // Most recent bookings first
    });

    // Cache the result if userId is provided
    if (userId) {
      const cacheKey = getBookingsByUserCacheKey(userId);
      await this.redisService.setJSON(cacheKey, bookings, CACHE_TTL.BOOKINGS_BY_USER);
    }

    return bookings;
  }

  async findOne(id: string, userId?: string): Promise<Booking> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const booking = await this.bookingModel.findOne({
      where,
      include: [
        { model: Flight, as: 'flight' },
        { model: User, as: 'user' },
        { 
          model: User, 
          as: 'provider',
          attributes: ['id', 'name', 'email'],
          required: false, // Allow null for backward compatibility
        },
      ],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async cancel(id: string, userId: string): Promise<Booking> {
    const booking = await this.findOne(id, userId);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    // Load flight to check departure time
    const flight = await this.flightModel.findByPk(booking.flightId);
    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    // Validate booking can be cancelled (before departure)
    this.timeValidationService.validateBookingCancellable(flight.departureTime);

    // Acquire lock for the flight
    const lockKey = getBookingLockKey(booking.flightId);
    const lockAcquired = await this.redisService.acquireLock(lockKey, CACHE_TTL.BOOKING_LOCK);

    if (!lockAcquired) {
      throw new BadRequestException('Flight is currently being processed. Please try again.');
    }

    try {
      const transaction: Transaction = await this.bookingModel.sequelize.transaction();

      try {
        // Re-check time inside transaction
        const now = this.timeValidationService.getCurrentTime();
        if (now >= flight.departureTime) {
          throw new BadRequestException('Cannot cancel booking after flight departure.');
        }

        // Update booking status
        await booking.update({ status: BookingStatus.CANCELLED }, { transaction });

        // Find flight with lock
        const lockedFlight = await this.flightModel.findByPk(booking.flightId, {
          lock: true,
          transaction,
        });

        // Restore seats
        await lockedFlight.update(
          {
            availableSeats: lockedFlight.availableSeats + booking.seatCount,
          },
          { transaction },
        );

        await transaction.commit();

        // Invalidate related caches (lockedFlight.providerId is available)
        await this.invalidateBookingRelatedCaches(booking.userId, booking.flightId, lockedFlight.providerId);

        return booking.reload();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  async board(id: string, boardBookingDto: BoardBookingDto, providerId: string): Promise<Booking> {
    const { status } = boardBookingDto;

    // Find booking with flight relation to check ownership
    const booking = await this.bookingModel.findOne({
      where: { id },
      include: [
        { model: Flight, as: 'flight' },
        { model: User, as: 'user' },
      ],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Verify that the flight belongs to the provider
    if (booking.flight.providerId !== providerId) {
      throw new ForbiddenException('You can only mark boarding for bookings on your own flights');
    }

    // Prevent user from self-marking boarded
    if (booking.userId === providerId) {
      throw new ForbiddenException('You cannot mark your own booking as boarded');
    }

    // Status validation: Only CONFIRMED bookings can be marked as BOARDED or NOT_BOARDED
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot mark boarding. Booking status must be CONFIRMED, but it is ${booking.status}`,
      );
    }

    // Validate flight status (must be SCHEDULED)
    if (booking.flight.status !== FlightStatus.SCHEDULED) {
      throw new BadRequestException(
        `Cannot mark boarding. Flight status must be SCHEDULED, but it is ${booking.flight.status}`,
      );
    }

    // Validate boarding window (45 minutes before departure)
    this.timeValidationService.validateBoardingWindow(booking.flight.departureTime);

    // Update booking status
    await booking.update({ status });

    return booking.reload();
  }

  /**
   * Updates bookings to NOT_BOARDED if their flight's departure time has passed
   * and the booking status is still CONFIRMED (not already BOARDED).
   * 
   * Rules:
   * - Only updates CONFIRMED bookings (never auto-marks BOARDED)
   * - Only updates if flight departureTime < current time
   * - Uses transaction for safe bulk updates
   * 
   * @returns Number of bookings updated
   */
  async updateExpiredBookings(): Promise<number> {
    const now = this.timeValidationService.getCurrentTime();

    // Use transaction for safe bulk update
    const transaction: Transaction = await this.bookingModel.sequelize.transaction();

    try {
      // Find all CONFIRMED bookings where flight departureTime has passed
      // Using include with where clause for efficient query
      const bookingsToUpdate = await this.bookingModel.findAll({
        where: {
          status: BookingStatus.CONFIRMED,
        },
        include: [
          {
            model: Flight,
            as: 'flight',
            required: true,
            where: {
              departureTime: {
                [Op.lt]: now, // departureTime < now
              },
            },
            attributes: [], // Don't load flight data, just use for filtering
          },
        ],
        attributes: ['id'], // Only load IDs for efficiency
        transaction,
      });

      if (bookingsToUpdate.length === 0) {
        await transaction.commit();
        return 0;
      }

      // Extract booking IDs for bulk update
      const bookingIds = bookingsToUpdate.map((booking) => booking.id);

      // Perform bulk update in transaction
      // Double-check status to prevent race conditions
      const [updatedCount] = await this.bookingModel.update(
        { status: BookingStatus.NOT_BOARDED },
        {
          where: {
            id: {
              [Op.in]: bookingIds,
            },
            status: BookingStatus.CONFIRMED, // Double-check status hasn't changed
          },
          transaction,
        },
      );

      await transaction.commit();

      return updatedCount;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Invalidate all caches related to a booking operation
   * - User dashboard cache
   * - User bookings cache
   * - Flight availability cache
   * - Flight bookings cache
   * - Flight passengers cache
   * - Provider dashboard cache (if providerId is provided)
   */
  private async invalidateBookingRelatedCaches(
    userId: string, 
    flightId: string, 
    providerId?: string
  ): Promise<void> {
    // Invalidate user dashboard cache
    const userDashboardKey = getUserDashboardCacheKey(userId);
    await this.redisService.del(userDashboardKey);

    // Invalidate user bookings cache
    const userBookingsKey = getBookingsByUserCacheKey(userId);
    await this.redisService.del(userBookingsKey);

    // Invalidate flight availability cache
    const availabilityKey = getFlightAvailabilityCacheKey(flightId);
    await this.redisService.del(availabilityKey);

    // Invalidate flight bookings cache
    const flightBookingsKey = getFlightBookingsCacheKey(flightId);
    await this.redisService.del(flightBookingsKey);

    // Invalidate flight passengers cache
    const flightPassengersKey = getFlightPassengersCacheKey(flightId);
    await this.redisService.del(flightPassengersKey);

    // Invalidate provider dashboard cache if providerId is available
    if (providerId) {
      const providerDashboardKey = getProviderDashboardCacheKey(providerId);
      await this.redisService.del(providerDashboardKey);
    }
  }
}

