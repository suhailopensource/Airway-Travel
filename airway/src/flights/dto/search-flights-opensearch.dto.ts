import { IsString, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchFlightsOpenSearchDto {
  @ApiPropertyOptional({ 
    example: 'New York', 
    description: 'Source/Origin city' 
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ 
    example: 'Los Angeles', 
    description: 'Destination city' 
  })
  @IsString()
  @IsOptional()
  destination?: string;

  @ApiPropertyOptional({ 
    example: 'Air India', 
    description: 'Provider/Airline name' 
  })
  @IsString()
  @IsOptional()
  providerName?: string;

  @ApiPropertyOptional({ 
    example: 'AI-101', 
    description: 'Flight number' 
  })
  @IsString()
  @IsOptional()
  flightNumber?: string;

  @ApiPropertyOptional({ 
    example: '2024-12-25', 
    description: 'Departure date (YYYY-MM-DD format)' 
  })
  @IsDateString()
  @IsOptional()
  departureDate?: string;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Page number (starts from 1)',
    minimum: 1,
    default: 1
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Number of results per page',
    minimum: 1,
    maximum: 100,
    default: 10
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

