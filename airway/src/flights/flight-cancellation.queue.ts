import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * Queue for handling flight cancellation bookings
 * 
 * When a flight is cancelled, this queue processes all bookings
 * asynchronously to avoid blocking the API request.
 */
export const FLIGHT_CANCELLATION_QUEUE = 'cancel-flight-bookings';

@Injectable()
export class FlightCancellationQueue {
  constructor(
    @InjectQueue(FLIGHT_CANCELLATION_QUEUE)
    private readonly queue: Queue,
  ) {}

  /**
   * Enqueue a job to cancel all bookings for a flight
   * 
   * @param flightId - The ID of the flight to cancel bookings for
   * @returns Job ID
   */
  async enqueueCancellationJob(flightId: string): Promise<string> {
    const job = await this.queue.add('cancel-bookings', {
      flightId,
    }, {
      // Retry configuration
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 seconds, then 4s, then 8s
      },
      // Job ID for idempotency (prevents duplicate jobs)
      jobId: `cancel-flight-${flightId}`,
      // Remove job after completion (keep for 24 hours)
      removeOnComplete: {
        age: 24 * 3600, // 24 hours in seconds
        count: 100, // Keep last 100 completed jobs
      },
      // Remove failed jobs after 7 days
      removeOnFail: {
        age: 7 * 24 * 3600, // 7 days in seconds
      },
    });

    return job.id!;
  }

  /**
   * Get queue instance (for dashboard/monitoring)
   */
  getQueue(): Queue {
    return this.queue;
  }
}
