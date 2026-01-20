import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bullmq';
import { FlightsService } from './flights.service';
import { FlightsSchedulerService } from './flights-scheduler.service';
import { FlightsController } from './flights.controller';
import { Flight } from './entities/flight.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { OpenSearchModule } from '../opensearch/opensearch.module';
import { RedisModule } from '../redis/redis.module';
import { FLIGHT_CANCELLATION_QUEUE } from './flight-cancellation.queue';
import { FlightCancellationQueue } from './flight-cancellation.queue';
import { FlightCancellationProcessor } from './flight-cancellation.processor';

@Module({
  imports: [
    SequelizeModule.forFeature([Flight, User, Booking]),
    OpenSearchModule,
    RedisModule,
    // Register the flight cancellation queue
    BullModule.registerQueue({
      name: FLIGHT_CANCELLATION_QUEUE,
    }),
  ],
  controllers: [FlightsController],
  providers: [
    FlightsService,
    FlightsSchedulerService,
    FlightCancellationQueue,
    FlightCancellationProcessor,
  ],
  exports: [FlightsService, FlightCancellationQueue],
})
export class FlightsModule {}

