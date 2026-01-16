import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../entities/booking.entity';

export class BookingResponseDto {
  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Booking ID',
    format: 'uuid'
  })
  id: string;

  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID who made the booking',
    format: 'uuid'
  })
  userId: string;

  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Flight ID being booked',
    format: 'uuid'
  })
  flightId: string;

  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Provider (Airline) ID',
    format: 'uuid'
  })
  providerId: string;

  @ApiProperty({ 
    example: 'Air India', 
    description: 'Provider (Airline) name'
  })
  providerName: string;

  @ApiProperty({ 
    example: 'airindia@example.com', 
    description: 'Provider (Airline) email'
  })
  providerEmail: string;

  @ApiProperty({ 
    example: 2, 
    description: 'Number of seats booked',
    minimum: 1
  })
  seatCount: number;

  @ApiProperty({ 
    example: BookingStatus.CONFIRMED,
    enum: BookingStatus,
    description: 'Booking status',
    enumName: 'BookingStatus'
  })
  status: BookingStatus;

  @ApiProperty({ 
    example: 599.98, 
    description: 'Total price for the booking',
    type: 'number',
    format: 'decimal'
  })
  totalPrice: number;

  @ApiProperty({ 
    example: '2024-01-13T14:20:00.000Z',
    description: 'Timestamp when the booking was made',
    type: 'string',
    format: 'date-time'
  })
  bookedAt: Date;

  @ApiProperty({ 
    example: '2024-01-13T14:20:00.000Z',
    description: 'Timestamp when the booking was created',
    type: 'string',
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({ 
    example: '2024-01-13T14:20:00.000Z',
    description: 'Timestamp when the booking was last updated',
    type: 'string',
    format: 'date-time'
  })
  updatedAt: Date;
}

export class BookingWithRelationsDto extends BookingResponseDto {
  @ApiProperty({ 
    description: 'Flight details',
    type: 'object',
    nullable: true
  })
  flight?: any;

  @ApiProperty({ 
    description: 'User details',
    type: 'object',
    nullable: true
  })
  user?: any;

  @ApiProperty({ 
    description: 'Provider (Airline) details',
    type: 'object',
    nullable: true
  })
  provider?: any;
}

