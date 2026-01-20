import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction, Op } from 'sequelize';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Flight } from './entities/flight.entity';
import { FLIGHT_CANCELLATION_QUEUE } from './flight-cancellation.queue';
import { RedisService } from '../redis/redis.service';
import {
  getFlightBookingsCacheKey,
  getFlightPassengersCacheKey,
  getProviderDashboardCacheKey,
  getBookingsByUserCacheKey,
  getUserDashboardCacheKey,
} from '../redis/cache-keys';

interface CancelFlightBookingsJobData {
  flightId: string;
}

/**
 * Processor for cancelling bookings when a flight is cancelled
 * 
 * This worker processes bookings in batches to handle large volumes efficiently.
 * It's idempotent and can safely retry if a job fails.
 */
@Processor(FLIGHT_CANCELLATION_QUEUE)
export class FlightCancellationProcessor extends WorkerHost {
  private readonly logger = new Logger(FlightCancellationProcessor.name);
  private readonly BATCH_SIZE = 100; // Process 100 bookings at a time

  constructor(
    @InjectModel(Booking)
    private bookingModel: typeof Booking,
    @InjectModel(Flight)
    private flightModel: typeof Flight,
    private redisService: RedisService,
  ) {
    super();
  }

  /**
   * Process the flight cancellation job
   * 
   * This method:
   * 1. Fetches bookings in batches
   * 2. For each batch, cancels CONFIRMED bookings and releases seats
   * 3. Uses transactions per batch for safety
   * 4. Skips already CANCELLED or BOARDED bookings
   */
  async process(job: Job<CancelFlightBookingsJobData>): Promise<void> {
    const { flightId } = job.data;
    this.logger.log(`Processing flight cancellation for flight ${flightId}`);

    try {
      // Verify flight exists and is cancelled
      const flight = await this.flightModel.findByPk(flightId);
      if (!flight) {
        throw new Error(`Flight ${flightId} not found`);
      }

      if (flight.status !== 'CANCELLED') {
        this.logger.warn(
          `Flight ${flightId} is not cancelled (status: ${flight.status}). Skipping booking cancellation.`,
        );
        return;
      }

      // Get total count of CONFIRMED bookings for progress tracking
      const totalCount = await this.bookingModel.count({
        where: {
          flightId,
          status: BookingStatus.CONFIRMED,
        },
      });

      if (totalCount === 0) {
        this.logger.log(`No CONFIRMED bookings found for flight ${flightId}`);
        return;
      }

      this.logger.log(
        `Found ${totalCount} CONFIRMED bookings to cancel for flight ${flightId}`,
      );

      let processedCount = 0;
      let offset = 0;
      let totalSeatsReleased = 0;

      // Process bookings in batches
      while (true) {
        // Fetch a batch of CONFIRMED bookings
        const bookings = await this.bookingModel.findAll({
          where: {
            flightId,
            status: BookingStatus.CONFIRMED, // Only process CONFIRMED bookings
          },
          limit: this.BATCH_SIZE,
          offset,
          order: [['createdAt', 'ASC']], // Process oldest first
        });

        if (bookings.length === 0) {
          break; // No more bookings to process
        }

        // Process this batch in a transaction
        const transaction: Transaction =
          await this.bookingModel.sequelize.transaction();

        try {
          // Get flight with lock for atomic seat restoration
          const lockedFlight = await this.flightModel.findByPk(flightId, {
            lock: true, // SELECT ... FOR UPDATE
            transaction,
          });

          if (!lockedFlight) {
            throw new Error(`Flight ${flightId} not found in transaction`);
          }

          // Calculate total seats to release from this batch
          let batchSeatsToRelease = 0;
          const bookingIds: string[] = [];

          for (const booking of bookings) {
            // Double-check status hasn't changed (idempotency)
            if (booking.status === BookingStatus.CONFIRMED) {
              bookingIds.push(booking.id);
              batchSeatsToRelease += booking.seatCount;
            }
          }

          if (bookingIds.length > 0) {
            // Update bookings to CANCELLED
            const [updatedCount] = await this.bookingModel.update(
              { status: BookingStatus.CANCELLED },
              {
                where: {
                  id: { [Op.in]: bookingIds },
                  status: BookingStatus.CONFIRMED, // Double-check status
                },
                transaction,
              },
            );

            // Note: Seats are already restored to totalSeats when flight was cancelled
            // We don't need to add seats back here, as they're already available
            // The flight cancellation in flights.service.ts sets availableSeats = totalSeats
            // This worker only needs to cancel the booking records

            processedCount += updatedCount;
            totalSeatsReleased += batchSeatsToRelease;

            this.logger.log(
              `Batch processed: ${updatedCount} bookings cancelled (${batchSeatsToRelease} seats were already released when flight was cancelled)`,
            );

            // Update job progress
            await job.updateProgress(
              Math.round((processedCount / totalCount) * 100),
            );
          }

          await transaction.commit();
        } catch (error) {
          await transaction.rollback();
          this.logger.error(
            `Error processing batch at offset ${offset}: ${error.message}`,
          );
          throw error; // Re-throw to trigger retry
        }

        offset += this.BATCH_SIZE;

        // If we got fewer bookings than batch size, we're done
        if (bookings.length < this.BATCH_SIZE) {
          break;
        }
      }

      // Invalidate caches after all bookings are cancelled
      await this.invalidateCaches(flightId, flight.providerId);

      this.logger.log(
        `Flight cancellation completed: ${processedCount} bookings cancelled for flight ${flightId} (seats were already restored when flight was cancelled)`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing flight cancellation for ${flightId}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Invalidate all caches related to the cancelled flight
   */
  private async invalidateCaches(
    flightId: string,
    providerId?: string,
  ): Promise<void> {
    try {
      // Invalidate flight bookings cache
      const flightBookingsKey = getFlightBookingsCacheKey(flightId);
      await this.redisService.del(flightBookingsKey);

      // Invalidate flight passengers cache
      const flightPassengersKey = getFlightPassengersCacheKey(flightId);
      await this.redisService.del(flightPassengersKey);

      // Invalidate provider dashboard cache
      if (providerId) {
        const providerDashboardKey = getProviderDashboardCacheKey(providerId);
        await this.redisService.del(providerDashboardKey);
      }

      // Note: We can't invalidate user-specific caches here because we don't know
      // which users had bookings. The cache TTL will handle expiration.
      // Alternatively, we could fetch all user IDs and invalidate, but that's expensive.
    } catch (error) {
      // Log but don't fail the job if cache invalidation fails
      this.logger.warn(`Failed to invalidate caches: ${error.message}`);
    }
  }

  /**
   * Log when a job completes successfully
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  /**
   * Log when a job fails
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  /**
   * Log when a job is retried
   */
  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `Job ${job.id} is now active (attempt ${job.attemptsMade + 1})`,
    );
  }
}
