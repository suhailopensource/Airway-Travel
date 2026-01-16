import { ApiProperty } from '@nestjs/swagger';

export class FlightBoardingDto {
  @ApiProperty({ example: 'uuid' })
  flightId: string;

  @ApiProperty({ example: 'AA123' })
  flightNumber: string;

  @ApiProperty({ example: 'New York' })
  origin: string;

  @ApiProperty({ example: 'Los Angeles' })
  destination: string;

  @ApiProperty({ example: '2024-12-25T10:00:00Z' })
  departureTime: Date;

  @ApiProperty({ example: 150, description: 'Total seats in flight' })
  totalSeats: number;

  @ApiProperty({ example: 45, description: 'Number of booked seats' })
  bookedSeats: number;

  @ApiProperty({ example: 105, description: 'Available seats' })
  availableSeats: number;
}

export class ProviderDashboardDto {
  @ApiProperty({ example: 10, description: 'Total number of flights' })
  totalFlights: number;

  @ApiProperty({ example: 1500, description: 'Total seats across all flights' })
  totalSeats: number;

  @ApiProperty({ example: 450, description: 'Total booked seats across all flights' })
  bookedSeats: number;

  @ApiProperty({
    type: [FlightBoardingDto],
    description: 'Boarding count per flight',
  })
  flights: FlightBoardingDto[];
}

