import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  Min,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFlightDto {
  @ApiProperty({ example: 'AI-101', description: 'Flight number' })
  @IsString()
  @IsNotEmpty()
  flightNumber: string;

  @ApiProperty({ example: 'New York', description: 'Source/Origin city' })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({ example: 'Los Angeles', description: 'Destination city' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ example: '2024-12-25T10:00:00Z', description: 'Departure date and time' })
  @IsDateString()
  @IsNotEmpty()
  departureTime: string;

  @ApiProperty({ example: '2024-12-25T13:00:00Z', description: 'Arrival date and time' })
  @IsDateString()
  @IsNotEmpty()
  arrivalTime: string;

  @ApiProperty({ example: 150, minimum: 1, description: 'Total number of seats' })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  totalSeats: number;

  @ApiProperty({ example: 299.99, minimum: 0, description: 'Price per seat' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsNotEmpty()
  price: number;
}

