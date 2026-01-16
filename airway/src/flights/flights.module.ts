import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { FlightsService } from './flights.service';
import { FlightsSchedulerService } from './flights-scheduler.service';
import { FlightsController } from './flights.controller';
import { Flight } from './entities/flight.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { OpenSearchModule } from '../opensearch/opensearch.module';

@Module({
  imports: [SequelizeModule.forFeature([Flight, User, Booking]), OpenSearchModule],
  controllers: [FlightsController],
  providers: [FlightsService, FlightsSchedulerService],
  exports: [FlightsService],
})
export class FlightsModule {}

