import { Module, Global } from '@nestjs/common';
import { TimeValidationService } from './services/time-validation.service';
import { FlightLifecycleService } from './services/flight-lifecycle.service';

@Global()
@Module({
  providers: [TimeValidationService, FlightLifecycleService],
  exports: [TimeValidationService, FlightLifecycleService],
})
export class CommonModule {}



