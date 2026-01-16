import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Flight, FlightStatus } from '../flights/entities/flight.entity';
import { UserDashboardDto, FlightInfoDto } from './dto/user-dashboard.dto';
import { ProviderDashboardDto, FlightBoardingDto } from './dto/provider-dashboard.dto';
import { RedisService } from '../redis/redis.service';
import { getUserDashboardCacheKey, getProviderDashboardCacheKey } from '../redis/cache-keys';
import { CACHE_TTL } from '../redis/cache-config';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Booking)
    private bookingModel: typeof Booking,
    @InjectModel(Flight)
    private flightModel: typeof Flight,
    private redisService: RedisService,
  ) {}

  async getUserDashboard(userId: string): Promise<UserDashboardDto> {
    // Check cache first
    const cacheKey = getUserDashboardCacheKey(userId);
    const cached = await this.redisService.getJSON<UserDashboardDto>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const now = new Date();

    // Get all confirmed bookings for the user with flight details
    const bookings = await this.bookingModel.findAll({
      where: {
        userId,
        status: BookingStatus.CONFIRMED,
      },
      include: [
        {
          model: Flight,
          as: 'flight',
          required: true,
          where: {
            status: FlightStatus.SCHEDULED,
          },
        },
      ],
      order: [['flight', 'departureTime', 'ASC']],
    });

    // Separate upcoming and past flights
    const upcomingFlights: FlightInfoDto[] = [];
    const pastFlights: FlightInfoDto[] = [];

    bookings.forEach((booking) => {
      const flight = booking.flight as Flight;
      const flightInfo: FlightInfoDto = {
        id: flight.id,
        flightNumber: flight.flightNumber,
        origin: flight.source,
        destination: flight.destination,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        numberOfSeats: booking.seatCount, // Map seatCount to numberOfSeats for DTO
        bookingStatus: booking.status,
        totalPrice: booking.totalPrice.toString(),
      };

      if (flight.departureTime > now) {
        upcomingFlights.push(flightInfo);
      } else {
        pastFlights.push(flightInfo);
      }
    });

    const dashboard: UserDashboardDto = {
      totalBookings: bookings.length,
      upcomingFlights,
      pastFlights,
    };

    // Cache the result
    await this.redisService.setJSON(cacheKey, dashboard, CACHE_TTL.DASHBOARD_USER);

    return dashboard;
  }

  async getProviderDashboard(providerId: string): Promise<ProviderDashboardDto> {
    // Check cache first
    const cacheKey = getProviderDashboardCacheKey(providerId);
    const cached = await this.redisService.getJSON<ProviderDashboardDto>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Get all flights for the provider
    const flights = await this.flightModel.findAll({
      where: { 
        providerId,
        status: FlightStatus.SCHEDULED,
      },
      include: [
        {
          model: Booking,
          as: 'bookings',
          where: {
            status: BookingStatus.CONFIRMED,
          },
          required: false,
        },
      ],
    });

    // Calculate aggregations
    let totalSeats = 0;
    let bookedSeats = 0;
    const flightBoarding: FlightBoardingDto[] = [];

    for (const flight of flights) {
      totalSeats += flight.totalSeats;

      // Calculate booked seats for this flight
      const flightBookings = flight.bookings || [];
      const flightBookedSeats = flightBookings.reduce(
        (sum, booking) => sum + booking.seatCount,
        0,
      );
      bookedSeats += flightBookedSeats;

      flightBoarding.push({
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        origin: flight.source,
        destination: flight.destination,
        departureTime: flight.departureTime,
        totalSeats: flight.totalSeats,
        bookedSeats: flightBookedSeats,
        availableSeats: flight.availableSeats,
      });
    }

    const dashboard: ProviderDashboardDto = {
      totalFlights: flights.length,
      totalSeats,
      bookedSeats,
      flights: flightBoarding,
    };

    // Cache the result
    await this.redisService.setJSON(cacheKey, dashboard, CACHE_TTL.DASHBOARD_PROVIDER);

    return dashboard;
  }
}
