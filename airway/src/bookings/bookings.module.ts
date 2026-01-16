import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BookingsService } from './bookings.service';
import { BookingsSchedulerService } from './bookings-scheduler.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { Flight } from '../flights/entities/flight.entity';
import { User } from '../users/entities/user.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Booking, Flight, User]),
    RedisModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsSchedulerService],
  exports: [BookingsService],
})
export class BookingsModule {}

