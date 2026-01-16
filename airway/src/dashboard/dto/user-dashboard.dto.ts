import { ApiProperty } from '@nestjs/swagger';

export class FlightInfoDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'AA123' })
  flightNumber: string;

  @ApiProperty({ example: 'New York' })
  origin: string;

  @ApiProperty({ example: 'Los Angeles' })
  destination: string;

  @ApiProperty({ example: '2024-12-25T10:00:00Z' })
  departureTime: Date;

  @ApiProperty({ example: '2024-12-25T13:00:00Z' })
  arrivalTime: Date;

  @ApiProperty({ example: 2, description: 'Number of seats booked' })
  numberOfSeats: number; // Keep for backward compatibility, maps to seatCount

  @ApiProperty({ example: 'CONFIRMED' })
  bookingStatus: string;

  @ApiProperty({ example: '599.98' })
  totalPrice: string;
}

export class UserDashboardDto {
  @ApiProperty({ example: 5, description: 'Total number of bookings' })
  totalBookings: number;

  @ApiProperty({
    type: [FlightInfoDto],
    description: 'Upcoming flights (departure time in future)',
  })
  upcomingFlights: FlightInfoDto[];

  @ApiProperty({
    type: [FlightInfoDto],
    description: 'Past flights (departure time in past)',
  })
  pastFlights: FlightInfoDto[];
}

