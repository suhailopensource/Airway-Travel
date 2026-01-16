import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../entities/booking.entity';

export class BoardBookingDto {
  @ApiProperty({ 
    example: BookingStatus.BOARDED,
    enum: [BookingStatus.BOARDED, BookingStatus.NOT_BOARDED],
    description: 'Boarding status to set. Must be either BOARDED or NOT_BOARDED',
    enumName: 'BookingStatus'
  })
  @IsEnum([BookingStatus.BOARDED, BookingStatus.NOT_BOARDED], {
    message: 'Status must be either BOARDED or NOT_BOARDED',
  })
  @IsNotEmpty()
  status: BookingStatus.BOARDED | BookingStatus.NOT_BOARDED;
}




