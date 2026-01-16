import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../../bookings/entities/booking.entity';

export class PassengerInfoDto {
  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID',
    format: 'uuid'
  })
  userId: string;

  @ApiProperty({ 
    example: 'John Doe',
    description: 'Passenger name'
  })
  name: string;

  @ApiProperty({ 
    example: 'john.doe@example.com',
    description: 'Passenger email'
  })
  email: string;

  @ApiProperty({ 
    example: 2,
    description: 'Total number of seats booked by this passenger'
  })
  totalSeats: number;

  @ApiProperty({ 
    example: 599.98,
    description: 'Total amount paid by this passenger',
    type: 'number'
  })
  totalAmount: number;

  @ApiProperty({ 
    example: '2024-01-13T14:20:00.000Z',
    description: 'Date when the first booking was made',
    format: 'date-time'
  })
  firstBookingDate: Date;

  @ApiProperty({ 
    example: 1,
    description: 'Number of bookings made by this passenger for this flight'
  })
  bookingCount: number;

  @ApiProperty({ 
    example: BookingStatus.CONFIRMED,
    enum: BookingStatus,
    description: 'Current booking status (if all bookings have same status)',
    enumName: 'BookingStatus'
  })
  status: BookingStatus;
}

export class FlightPassengerListDto {
  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Flight ID',
    format: 'uuid'
  })
  flightId: string;

  @ApiProperty({ 
    example: 'AI-101',
    description: 'Flight number'
  })
  flightNumber: string;

  @ApiProperty({ 
    example: 'New York',
    description: 'Source city'
  })
  source: string;

  @ApiProperty({ 
    example: 'Los Angeles',
    description: 'Destination city'
  })
  destination: string;

  @ApiProperty({ 
    example: '2024-01-13T10:00:00.000Z',
    description: 'Departure time',
    format: 'date-time'
  })
  departureTime: Date;

  @ApiProperty({ 
    example: 5,
    description: 'Total number of unique passengers'
  })
  totalPassengers: number;

  @ApiProperty({ 
    example: 10,
    description: 'Total number of seats booked'
  })
  totalSeatsBooked: number;

  @ApiProperty({ 
    example: 2999.90,
    description: 'Total revenue from bookings',
    type: 'number'
  })
  totalRevenue: number;

  @ApiProperty({ 
    type: [PassengerInfoDto],
    description: 'List of passengers with aggregated booking information'
  })
  passengers: PassengerInfoDto[];
}

