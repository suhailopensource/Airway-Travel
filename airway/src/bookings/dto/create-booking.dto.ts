import { IsUUID, IsInt, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Flight ID to book',
    format: 'uuid'
  })
  @IsUUID()
  @IsNotEmpty()
  flightId: string;

  @ApiProperty({ 
    example: 2, 
    minimum: 1,
    description: 'Number of seats to book (seatCount)',
    type: 'integer'
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  seatCount: number;
}

