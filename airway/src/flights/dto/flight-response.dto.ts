import { ApiProperty } from '@nestjs/swagger';
import { FlightStatus } from '../entities/flight.entity';

export class FlightResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'AI-101' })
  flightNumber: string;

  @ApiProperty({ example: 'New York' })
  source: string;

  @ApiProperty({ example: 'Los Angeles' })
  destination: string;

  @ApiProperty({ example: '2024-12-25T10:00:00Z' })
  departureTime: Date;

  @ApiProperty({ example: '2024-12-25T13:00:00Z' })
  arrivalTime: Date;

  @ApiProperty({ example: 150 })
  totalSeats: number;

  @ApiProperty({ example: 150 })
  availableSeats: number;

  @ApiProperty({ example: 299.99 })
  price: number;

  @ApiProperty({ example: FlightStatus.SCHEDULED, enum: FlightStatus })
  status: FlightStatus;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  providerId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class FlightWithProviderDto extends FlightResponseDto {
  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
      name: { type: 'string', example: 'Air India' },
      email: { type: 'string', example: 'airindia@example.com' },
    },
    description: 'Provider (airline) information',
  })
  provider: {
    id: string;
    name: string;
    email: string;
  };
}


