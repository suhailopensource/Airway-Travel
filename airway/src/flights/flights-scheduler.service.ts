import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction, Op } from 'sequelize';
import { Flight, FlightStatus } from './entities/flight.entity';
import { TimeValidationService } from '../common/services/time-validation.service';
import { FlightLifecycleService } from '../common/services/flight-lifecycle.service';

@Injectable()
export class FlightsSchedulerService {
  private readonly logger = new Logger(FlightsSchedulerService.name);

  constructor(
    @InjectModel(Flight)
    private flightModel: typeof Flight,
    private timeValidationService: TimeValidationService,
    private flightLifecycleService: FlightLifecycleService,
  ) {}

  /**
   * Scheduled task that runs every 5 minutes to update flight statuses.
   * 
   * Flight Status Transitions:
   * - SCHEDULED → IN_AIR when currentTime >= departureTime
   * - IN_AIR → COMPLETED when currentTime >= arrivalTime
   * - On COMPLETED: Reset availableSeats = totalSeats
   * - CANCELLED overrides all states
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleFlightStatusUpdates() {
    this.logger.log('Running scheduled task: Update flight statuses');

    try {
      const now = this.timeValidationService.getCurrentTime();
      const transaction: Transaction = await this.flightModel.sequelize.transaction();

      try {
        // Find flights that need status updates
        // SCHEDULED flights that should be IN_AIR
        const flightsToInAir = await this.flightModel.findAll({
          where: {
            status: FlightStatus.SCHEDULED,
            departureTime: {
              [Op.lte]: now, // departureTime <= now
            },
          },
          transaction,
        });

        // IN_AIR flights that should be COMPLETED
        const flightsToCompleted = await this.flightModel.findAll({
          where: {
            status: FlightStatus.IN_AIR,
            arrivalTime: {
              [Op.lte]: now, // arrivalTime <= now
            },
          },
          transaction,
        });

        let inAirCount = 0;
        let completedCount = 0;

        // Update SCHEDULED → IN_AIR
        if (flightsToInAir.length > 0) {
          const flightIds = flightsToInAir.map((f) => f.id);
          const [updated] = await this.flightModel.update(
            { status: FlightStatus.IN_AIR },
            {
              where: {
                id: { [Op.in]: flightIds },
                status: FlightStatus.SCHEDULED, // Double-check
              },
              transaction,
            },
          );
          inAirCount = updated;
        }

        // Update IN_AIR → COMPLETED and reset seats
        if (flightsToCompleted.length > 0) {
          const flightIds = flightsToCompleted.map((f) => f.id);
          
          // Update status and reset available seats
          for (const flight of flightsToCompleted) {
            await flight.update(
              {
                status: FlightStatus.COMPLETED,
                availableSeats: flight.totalSeats, // Reset seats when completed
              },
              { transaction },
            );
          }
          completedCount = flightsToCompleted.length;
        }

        await transaction.commit();

        if (inAirCount > 0 || completedCount > 0) {
          this.logger.log(
            `Successfully updated ${inAirCount} flight(s) to IN_AIR, ${completedCount} flight(s) to COMPLETED`,
          );
        } else {
          this.logger.debug('No flights needed status update');
        }
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      this.logger.error(
        `Error updating flight statuses: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow scheduler to continue running
    }
  }
}

