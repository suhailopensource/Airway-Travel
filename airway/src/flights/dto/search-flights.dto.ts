import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchFlightsDto {
  @ApiPropertyOptional({ example: 'New York', description: 'Source/Origin city (deprecated: use source)' })
  @IsString()
  @IsOptional()
  origin?: string;

  @ApiPropertyOptional({ example: 'New York', description: 'Source/Origin city' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'Los Angeles' })
  @IsString()
  @IsOptional()
  destination?: string;

  @ApiPropertyOptional({ example: '2024-12-25' })
  @IsDateString()
  @IsOptional()
  departureDate?: string;
}

