import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { BookingsService } from '../bookings/bookings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { UserBookingHistoryDto } from './dto/user-booking-history.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get('profile')
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Returns the profile information of the authenticated user. Password is excluded from response.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile information',
    schema: {
      example: {
        id: 'uuid',
        email: 'john.doe@example.com',
        name: 'John Doe',
        role: 'USER',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  getProfile(@CurrentUser() user: User) {
    const { password, ...result } = user.toJSON();
    return result;
  }

  @Get('me/bookings')
  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @ApiOperation({ 
    summary: 'Get user booking history', 
    description: 'Returns all bookings for the authenticated user with complete flight details and booking status. Only USER role can access their own booking history.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of user bookings with flight details',
    type: [UserBookingHistoryDto],
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
          flightId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
          seatCount: { type: 'number', example: 2 },
          status: { type: 'string', example: 'CONFIRMED', enum: ['CONFIRMED', 'CANCELLED'] },
          totalPrice: { type: 'number', example: 599.98 },
          bookedAt: { type: 'string', format: 'date-time', example: '2024-01-13T14:20:00.000Z' },
          createdAt: { type: 'string', format: 'date-time', example: '2024-01-13T14:20:00.000Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2024-01-13T14:20:00.000Z' },
          flight: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
              flightNumber: { type: 'string', example: 'AI-101' },
              source: { type: 'string', example: 'New York' },
              destination: { type: 'string', example: 'Los Angeles' },
              departureTime: { type: 'string', format: 'date-time', example: '2024-01-13T10:00:00.000Z' },
              arrivalTime: { type: 'string', format: 'date-time', example: '2024-01-13T13:00:00.000Z' },
              totalSeats: { type: 'number', example: 150 },
              availableSeats: { type: 'number', example: 148 },
              price: { type: 'number', example: 299.99 },
              status: { type: 'string', example: 'SCHEDULED', enum: ['SCHEDULED', 'CANCELLED', 'IN_AIR', 'COMPLETED'] }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Missing or invalid token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - USER role required' 
  })
  async getMyBookings(@CurrentUser() user: User): Promise<UserBookingHistoryDto[]> {
    const bookings = await this.bookingsService.findAll(user.id);
    
    // Transform to UserBookingHistoryDto format
    return bookings
      .filter((booking) => booking.flight !== null) // Only include bookings with flight details
      .map((booking) => ({
        id: booking.id,
        flightId: booking.flightId,
        providerId: booking.providerId || booking.flight?.providerId,
        providerName: booking.providerName || booking.provider?.name || booking.flight?.provider?.name,
        providerEmail: booking.providerEmail || booking.provider?.email || booking.flight?.provider?.email,
        seatCount: booking.seatCount,
        status: booking.status,
        totalPrice: booking.totalPrice,
        bookedAt: booking.bookedAt,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        flight: {
          id: booking.flight.id,
          flightNumber: booking.flight.flightNumber,
          source: booking.flight.source,
          destination: booking.flight.destination,
          departureTime: booking.flight.departureTime,
          arrivalTime: booking.flight.arrivalTime,
          totalSeats: booking.flight.totalSeats,
          availableSeats: booking.flight.availableSeats,
          price: booking.flight.price,
          status: booking.flight.status,
        },
      }));
  }
}

