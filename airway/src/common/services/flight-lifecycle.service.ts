import { Injectable } from '@nestjs/common';
import { Flight, FlightStatus } from '../../flights/entities/flight.entity';
import { TimeValidationService } from './time-validation.service';

@Injectable()
export class FlightLifecycleService {
  constructor(private readonly timeValidationService: TimeValidationService) {}

  /**
   * Determine what status a flight should have based on current time
   * Does not modify the flight, only determines the expected status
   */
  determineFlightStatus(flight: Flight): FlightStatus {
    const now = this.timeValidationService.getCurrentTime();

    // CANCELLED overrides all states
    if (flight.status === FlightStatus.CANCELLED) {
      return FlightStatus.CANCELLED;
    }

    // Status transitions based on time
    if (now >= flight.arrivalTime) {
      return FlightStatus.COMPLETED;
    }

    if (now >= flight.departureTime) {
      return FlightStatus.IN_AIR;
    }

    return FlightStatus.SCHEDULED;
  }

  /**
   * Check if flight status needs to be updated
   */
  needsStatusUpdate(flight: Flight): boolean {
    const expectedStatus = this.determineFlightStatus(flight);
    return flight.status !== expectedStatus && flight.status !== FlightStatus.CANCELLED;
  }

  /**
   * Get the next status transition for a flight
   */
  getNextStatus(flight: Flight): FlightStatus | null {
    const now = this.timeValidationService.getCurrentTime();

    if (flight.status === FlightStatus.CANCELLED) {
      return null; // CANCELLED is terminal
    }

    if (flight.status === FlightStatus.SCHEDULED && now >= flight.departureTime) {
      return FlightStatus.IN_AIR;
    }

    if (flight.status === FlightStatus.IN_AIR && now >= flight.arrivalTime) {
      return FlightStatus.COMPLETED;
    }

    return null; // No transition needed
  }

  /**
   * Check if flight should reset available seats (when completed)
   */
  shouldResetSeats(flight: Flight): boolean {
    const now = this.timeValidationService.getCurrentTime();
    return (
      flight.status === FlightStatus.IN_AIR &&
      now >= flight.arrivalTime &&
      flight.availableSeats !== flight.totalSeats
    );
  }
}




