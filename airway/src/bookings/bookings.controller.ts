import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BoardBookingDto } from './dto/board-booking.dto';
import { BookingResponseDto, BookingWithRelationsDto } from './dto/booking-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @ApiOperation({ 
    summary: 'Create a new booking', 
    description: 'Only USER role can create bookings. Uses transaction-safe logic with Redis locks and SELECT ... FOR UPDATE to prevent race conditions and overselling. Cannot book if availableSeats = 0.'
  })
  @ApiBody({ 
    type: CreateBookingDto,
    description: 'Booking details including flight ID and number of seats'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Booking created successfully',
    type: BookingResponseDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        flightId: '550e8400-e29b-41d4-a716-446655440002',
        seatCount: 2,
        status: 'CONFIRMED',
        totalPrice: 599.98,
        bookedAt: '2024-01-13T14:20:00.000Z',
        createdAt: '2024-01-13T14:20:00.000Z',
        updatedAt: '2024-01-13T14:20:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid data, insufficient seats, flight not available, or seatCount must be > 0' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Missing or invalid token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - USER role required' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Flight not found' 
  })
  create(@Body() createBookingDto: CreateBookingDto, @CurrentUser() user: User) {
    return this.bookingsService.create(createBookingDto, user.id);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @ApiOperation({ 
    summary: 'Get my bookings', 
    description: 'Returns all bookings for the authenticated user with flight and user details. Only USER role can access their own bookings.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of user bookings with flight and user relations',
    type: [BookingWithRelationsDto],
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
          userId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
          flightId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440002' },
          seatCount: { type: 'number', example: 2 },
          status: { type: 'string', example: 'CONFIRMED' },
          totalPrice: { type: 'number', example: 599.98 },
          bookedAt: { type: 'string', format: 'date-time', example: '2024-01-13T14:20:00.000Z' },
          createdAt: { type: 'string', format: 'date-time', example: '2024-01-13T14:20:00.000Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2024-01-13T14:20:00.000Z' },
          flight: { type: 'object', description: 'Flight details' },
          user: { type: 'object', description: 'User details' }
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
  getMyBookings(@CurrentUser() user: User) {
    return this.bookingsService.findAll(user.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @ApiOperation({ 
    summary: 'Get a booking by ID', 
    description: 'Returns booking details with flight and user relations. Only USER role can access their own bookings.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Booking ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Booking details with flight and user relations',
    type: BookingWithRelationsDto,
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        userId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
        flightId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440002' },
        seatCount: { type: 'number', example: 2 },
        status: { type: 'string', example: 'CONFIRMED' },
        totalPrice: { type: 'number', example: 599.98 },
        bookedAt: { type: 'string', format: 'date-time', example: '2024-01-13T14:20:00.000Z' },
        createdAt: { type: 'string', format: 'date-time', example: '2024-01-13T14:20:00.000Z' },
        updatedAt: { type: 'string', format: 'date-time', example: '2024-01-13T14:20:00.000Z' },
        flight: { type: 'object', description: 'Flight details' },
        user: { type: 'object', description: 'User details' }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Missing or invalid token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - USER role required or booking does not belong to user' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Booking not found' 
  })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingsService.findOne(id, user.id);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @ApiOperation({ 
    summary: 'Cancel a booking', 
    description: 'Cancels a booking and restores seats to the flight. Uses transaction-safe logic with Redis locks to prevent race conditions. Only USER role can cancel their own bookings.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Booking ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Booking cancelled successfully and seats restored to flight',
    type: BookingResponseDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        flightId: '550e8400-e29b-41d4-a716-446655440002',
        seatCount: 2,
        status: 'CANCELLED',
        totalPrice: 599.98,
        bookedAt: '2024-01-13T14:20:00.000Z',
        createdAt: '2024-01-13T14:20:00.000Z',
        updatedAt: '2024-01-13T15:30:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Booking already cancelled' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Missing or invalid token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - USER role required or booking does not belong to user' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Booking not found' 
  })
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingsService.cancel(id, user.id);
  }

  @Patch(':id/board')
  @UseGuards(RolesGuard)
  @Roles(Role.AIRWAY_PROVIDER)
  @ApiOperation({ 
    summary: 'Mark booking as boarded or not boarded', 
    description: 'Marks a booking as BOARDED or NOT_BOARDED. Only AIRWAY_PROVIDER role can mark boarding for bookings on their own flights. Users cannot self-mark their own bookings as boarded. Only CONFIRMED bookings can be marked.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Booking ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid'
  })
  @ApiBody({ 
    type: BoardBookingDto,
    description: 'Boarding status (BOARDED or NOT_BOARDED)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Booking status updated successfully',
    type: BookingResponseDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        flightId: '550e8400-e29b-41d4-a716-446655440002',
        seatCount: 2,
        status: 'BOARDED',
        totalPrice: 599.98,
        bookedAt: '2024-01-13T14:20:00.000Z',
        createdAt: '2024-01-13T14:20:00.000Z',
        updatedAt: '2024-01-13T16:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Booking status must be CONFIRMED to mark boarding, or invalid status provided' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Missing or invalid token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - AIRWAY_PROVIDER role required, flight does not belong to provider, or user attempting to self-mark boarding' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Booking not found' 
  })
  board(@Param('id') id: string, @Body() boardBookingDto: BoardBookingDto, @CurrentUser() user: User) {
    return this.bookingsService.board(id, boardBookingDto, user.id);
  }
}

