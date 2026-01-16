import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Booking } from '../bookings/entities/booking.entity';
import { Flight } from '../flights/entities/flight.entity';

@Module({
  imports: [SequelizeModule.forFeature([Booking, Flight])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

