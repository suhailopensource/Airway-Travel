import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../../bookings/entities/booking.entity';

export class FlightDetailsDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'AI-101' })
  flightNumber: string;

  @ApiProperty({ example: 'New York' })
  source: string;

  @ApiProperty({ example: 'Los Angeles' })
  destination: string;

  @ApiProperty({ example: '2024-01-13T10:00:00.000Z', format: 'date-time' })
  departureTime: Date;

  @ApiProperty({ example: '2024-01-13T13:00:00.000Z', format: 'date-time' })
  arrivalTime: Date;

  @ApiProperty({ example: 150 })
  totalSeats: number;

  @ApiProperty({ example: 148 })
  availableSeats: number;

  @ApiProperty({ example: 299.99, type: 'number' })
  price: number;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'CANCELLED'] })
  status: string;
}

export class UserBookingHistoryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', format: 'uuid' })
  flightId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', format: 'uuid', description: 'Provider (Airline) ID' })
  providerId: string;

  @ApiProperty({ example: 'Air India', description: 'Provider (Airline) name' })
  providerName: string;

  @ApiProperty({ example: 'airindia@example.com', description: 'Provider (Airline) email' })
  providerEmail: string;

  @ApiProperty({ example: 2, description: 'Number of seats booked' })
  seatCount: number;

  @ApiProperty({ 
    example: BookingStatus.CONFIRMED, 
    enum: BookingStatus,
    description: 'Booking status',
    enumName: 'BookingStatus'
  })
  status: BookingStatus;

  @ApiProperty({ example: 599.98, type: 'number', description: 'Total price for the booking' })
  totalPrice: number;

  @ApiProperty({ example: '2024-01-13T14:20:00.000Z', format: 'date-time' })
  bookedAt: Date;

  @ApiProperty({ example: '2024-01-13T14:20:00.000Z', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-13T14:20:00.000Z', format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ type: () => FlightDetailsDto, description: 'Flight details' })
  flight: FlightDetailsDto;
}

