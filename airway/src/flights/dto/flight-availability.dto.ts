import { ApiProperty } from '@nestjs/swagger';
import { FlightStatus } from '../entities/flight.entity';

export class FlightAvailabilityDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  flightId: string;

  @ApiProperty({ example: 'AI-101' })
  flightNumber: string;

  @ApiProperty({ example: 150, description: 'Total number of seats on the flight' })
  totalSeats: number;

  @ApiProperty({ example: 120, description: 'Number of seats currently available' })
  availableSeats: number;

  @ApiProperty({ example: 30, description: 'Number of seats already booked' })
  bookedSeats: number;

  @ApiProperty({ example: FlightStatus.SCHEDULED, enum: FlightStatus, description: 'Flight status' })
  status: FlightStatus;

  @ApiProperty({ example: true, description: 'Whether the flight is available for booking' })
  isAvailable: boolean;

  @ApiProperty({ example: '2024-12-25T10:00:00Z', description: 'Departure time' })
  departureTime: Date;

  @ApiProperty({ example: 'New York', description: 'Source city' })
  source: string;

  @ApiProperty({ example: 'Los Angeles', description: 'Destination city' })
  destination: string;
}

