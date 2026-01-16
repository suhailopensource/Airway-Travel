import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';

@Injectable()
export class BookingsSchedulerService {
  private readonly logger = new Logger(BookingsSchedulerService.name);

  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Scheduled task that runs every 5 minutes to update booking statuses.
   * 
   * Updates bookings to NOT_BOARDED if:
   * - Flight departureTime has passed
   * - Booking status is still CONFIRMED (not already BOARDED)
   * 
   * Never auto-marks bookings as BOARDED - that can only be done manually by providers.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredBookings() {
    this.logger.log('Running scheduled task: Update expired bookings to NOT_BOARDED');

    try {
      const updatedCount = await this.bookingsService.updateExpiredBookings();

      if (updatedCount > 0) {
        this.logger.log(`Successfully updated ${updatedCount} booking(s) to NOT_BOARDED`);
      } else {
        this.logger.debug('No bookings needed status update');
      }
    } catch (error) {
      this.logger.error(
        `Error updating expired bookings: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow scheduler to continue running
    }
  }
}

