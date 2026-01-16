import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FlightsService } from './flights.service';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { SearchFlightsOpenSearchDto } from './dto/search-flights-opensearch.dto';
import { FlightResponseDto, FlightWithProviderDto } from './dto/flight-response.dto';
import { FlightAvailabilityDto } from './dto/flight-availability.dto';
import { FlightPassengerListDto } from './dto/passenger-list.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRWAY_PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a new flight',
    description: 'Only AIRWAY_PROVIDER can create flights. The flight will be associated with the authenticated provider.'
  })
  @ApiBody({ type: CreateFlightDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Flight created successfully',
    type: FlightResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data (e.g., arrival time before departure time)' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - AIRWAY_PROVIDER role required' })
  create(@Body() createFlightDto: CreateFlightDto, @CurrentUser() user: User) {
    return this.flightsService.create(createFlightDto, user.id);
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search flights using OpenSearch',
    description: 'Advanced flight search using OpenSearch with pagination and multiple filters. Supports fuzzy matching for source, destination, and provider name. Returns only active flights with available seats. All query parameters are optional - you can combine multiple filters for refined searches.'
  })
  @ApiQuery({ 
    name: 'source', 
    required: false, 
    description: 'Source/Origin city (fuzzy search - handles typos)',
    example: 'New York',
    type: String
  })
  @ApiQuery({ 
    name: 'origin', 
    required: false, 
    description: 'Source/Origin city (deprecated: use source)',
    example: 'New York',
    type: String
  })
  @ApiQuery({ 
    name: 'destination', 
    required: false, 
    description: 'Destination city (fuzzy search - handles typos)',
    example: 'Los Angeles',
    type: String
  })
  @ApiQuery({ 
    name: 'providerName', 
    required: false, 
    description: 'Provider/Airline name (fuzzy search - handles typos)',
    example: 'Air India',
    type: String
  })
  @ApiQuery({ 
    name: 'flightNumber', 
    required: false, 
    description: 'Flight number (exact match)',
    example: 'AI-101',
    type: String
  })
  @ApiQuery({ 
    name: 'departureDate', 
    required: false, 
    description: 'Departure date in YYYY-MM-DD format',
    example: '2024-12-25',
    type: String
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    description: 'Page number (starts from 1). Default: 1. Minimum: 1',
    example: 1,
    type: Number
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Number of results per page. Default: 10. Minimum: 1, Maximum: 100',
    example: 10,
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results with pagination',
    schema: {
      type: 'object',
      properties: {
        flights: {
          type: 'array',
          items: { $ref: '#/components/schemas/FlightWithProviderDto' }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 50 },
            totalPages: { type: 'number', example: 5 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false }
          }
        }
      },
      example: {
        flights: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            flightNumber: 'AI-101',
            source: 'New York',
            destination: 'Los Angeles',
            departureTime: '2024-12-25T10:00:00Z',
            arrivalTime: '2024-12-25T13:00:00Z',
            totalSeats: 150,
            availableSeats: 120,
            price: 299.99,
            status: 'SCHEDULED',
            provider: {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'Air India',
              email: 'airindia@example.com'
            }
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5,
          hasNext: true,
          hasPrev: false
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid query parameters (e.g., invalid date format, page < 1, limit > 100)'
  })
  search(@Query() searchDto: SearchFlightsOpenSearchDto) {
    // Support backward compatibility: convert 'origin' to 'source' if provided
    if (searchDto.source === undefined && (searchDto as any).origin) {
      searchDto.source = (searchDto as any).origin;
    }
    return this.flightsService.searchWithOpenSearch(searchDto);
  }

  @Get('provider/:providerId')
  @ApiOperation({ 
    summary: 'Get flights by provider',
    description: 'Public endpoint. Returns all available flights for a specific provider (airline). Only shows active, future flights with available seats. No authentication required.'
  })
  @ApiParam({ 
    name: 'providerId', 
    description: 'Provider (AIRWAY_PROVIDER) user ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of flights for the specified provider',
    type: [FlightWithProviderDto],
  })
  @ApiResponse({ status: 404, description: 'Provider not found or is not an AIRWAY_PROVIDER' })
  getFlightsByProvider(@Param('providerId') providerId: string) {
    return this.flightsService.findByProviderId(providerId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRWAY_PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get all flights for authenticated provider',
    description: 'Returns all flights created by the authenticated provider. Flights are sorted by departure time (ascending).'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of provider flights',
    type: [FlightWithProviderDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - AIRWAY_PROVIDER role required' })
  getMyFlights(@CurrentUser() user: User) {
    return this.flightsService.findByProvider(user.id);
  }

  @Get(':id/availability')
  @ApiOperation({ 
    summary: 'Get seat availability for a flight',
    description: 'Public endpoint. Returns real-time seat availability information for a specific flight. Shows total seats, available seats, booked seats, and booking status.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Flight ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Flight seat availability information',
    type: FlightAvailabilityDto,
  })
  @ApiResponse({ status: 404, description: 'Flight not found' })
  getAvailability(@Param('id') id: string) {
    return this.flightsService.getAvailability(id);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a flight by ID',
    description: 'Returns flight details including provider information. Public endpoint - no authentication required.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Flight ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Flight details with provider information',
    type: FlightWithProviderDto,
  })
  @ApiResponse({ status: 404, description: 'Flight not found' })
  findOne(@Param('id') id: string) {
    return this.flightsService.findOne(id);
  }

  @Get(':id/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRWAY_PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get bookings for a flight',
    description: 'Returns all bookings for a specific flight. Only the provider who owns the flight can view its bookings.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Flight ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of bookings for the flight',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          flightId: { type: 'string' },
          seatCount: { type: 'number' },
          status: { type: 'string', enum: ['CONFIRMED', 'CANCELLED'] },
          totalPrice: { type: 'number' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only flight owner can view bookings' })
  @ApiResponse({ status: 404, description: 'Flight not found' })
  getFlightBookings(@Param('id') id: string, @CurrentUser() user: User) {
    return this.flightsService.getFlightBookings(id, user.id);
  }

  @Get(':id/passengers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRWAY_PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get passenger list for a flight',
    description: 'Returns aggregated passenger list for a specific flight. Passengers are grouped by user with total seats, total amount, and booking count. Only the provider who owns the flight can view its passengers.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Flight ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Aggregated passenger list with flight details and statistics. Passengers are grouped by user ID, showing total seats booked, total amount paid, and booking count per passenger.',
    type: FlightPassengerListDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Missing or invalid token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Only flight owner can view passengers' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Flight not found' 
  })
  getFlightPassengers(@Param('id') id: string, @CurrentUser() user: User): Promise<FlightPassengerListDto> {
    return this.flightsService.getFlightPassengers(id, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRWAY_PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update a flight',
    description: 'Only the provider who owns the flight can update it.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Flight ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiBody({ type: UpdateFlightDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Flight updated successfully',
    type: FlightResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data (e.g., arrival time before departure time)' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner can update' })
  @ApiResponse({ status: 404, description: 'Flight not found' })
  update(
    @Param('id') id: string,
    @Body() updateFlightDto: UpdateFlightDto,
    @CurrentUser() user: User,
  ) {
    return this.flightsService.update(id, updateFlightDto, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AIRWAY_PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Cancel a flight',
    description: 'Only the provider who owns the flight can cancel it. The flight status will be set to CANCELLED.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Flight ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({ status: 200, description: 'Flight cancelled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner can cancel' })
  @ApiResponse({ status: 404, description: 'Flight not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.flightsService.remove(id, user.id, user.role);
  }
}
