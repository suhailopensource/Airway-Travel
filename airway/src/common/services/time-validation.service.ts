import { Injectable, BadRequestException } from '@nestjs/common';
import { Flight, FlightStatus } from '../../flights/entities/flight.entity';
import {
  FlightDepartedException,
  FlightInAirException,
  FlightCompletedException,
  InvalidDepartureTimeException,
  InvalidArrivalTimeException,
  InvalidTimeWindowException,
  BookingClosedException,
} from '../exceptions/business.exceptions';

@Injectable()
export class TimeValidationService {
  /**
   * Get current server time in UTC
   */
  getCurrentTime(): Date {
    return new Date();
  }

  /**
   * Validate that departure time is in the future
   */
  validateDepartureTimeInFuture(departureTime: Date): void {
    const now = this.getCurrentTime();
    if (departureTime <= now) {
      throw new InvalidDepartureTimeException();
    }
  }

  /**
   * Validate that arrival time is after departure time
   */
  validateArrivalAfterDeparture(departureTime: Date, arrivalTime: Date): void {
    if (arrivalTime <= departureTime) {
      throw new InvalidArrivalTimeException();
    }
  }

  /**
   * Check if flight has departed
   */
  hasFlightDeparted(departureTime: Date): boolean {
    const now = this.getCurrentTime();
    return now >= departureTime;
  }

  /**
   * Check if flight has arrived
   */
  hasFlightArrived(arrivalTime: Date): boolean {
    const now = this.getCurrentTime();
    return now >= arrivalTime;
  }

  /**
   * Validate flight is bookable (not departed, not in air, not completed, not cancelled)
   */
  validateFlightBookable(flight: Flight): void {
    const now = this.getCurrentTime();

    // Check status-based restrictions
    if (flight.status === FlightStatus.CANCELLED) {
      throw new BadRequestException('Flight has been cancelled. Booking is not allowed.');
    }

    if (flight.status === FlightStatus.IN_AIR) {
      throw new FlightInAirException();
    }

    if (flight.status === FlightStatus.COMPLETED) {
      throw new FlightCompletedException();
    }

    // Check time-based restrictions (even if status appears valid)
    if (now >= flight.departureTime) {
      throw new FlightDepartedException();
    }
  }

  /**
   * Validate booking can be cancelled (before departure)
   */
  validateBookingCancellable(departureTime: Date): void {
    const now = this.getCurrentTime();
    if (now >= departureTime) {
      throw new BookingClosedException('Cannot cancel booking after flight departure.');
    }
  }

  /**
   * Validate flight can be cancelled (before departure)
   */
  validateFlightCancellable(departureTime: Date): void {
    const now = this.getCurrentTime();
    if (now >= departureTime) {
      throw new BookingClosedException('Cannot cancel flight after departure time.');
    }
  }

  /**
   * Validate boarding window (45 minutes before departure)
   */
  validateBoardingWindow(
    departureTime: Date,
    boardingWindowMinutes: number = 45,
  ): void {
    const now = this.getCurrentTime();
    const boardingStartTime = new Date(
      departureTime.getTime() - boardingWindowMinutes * 60 * 1000,
    );

    if (now < boardingStartTime) {
      throw new InvalidTimeWindowException(
        `Boarding window opens ${boardingWindowMinutes} minutes before departure.`,
      );
    }

    if (now > departureTime) {
      throw new InvalidTimeWindowException(
        'Boarding window has closed. Flight has departed.',
      );
    }
  }

  /**
   * Check if current time is within boarding window
   */
  isWithinBoardingWindow(
    departureTime: Date,
    boardingWindowMinutes: number = 45,
  ): boolean {
    const now = this.getCurrentTime();
    const boardingStartTime = new Date(
      departureTime.getTime() - boardingWindowMinutes * 60 * 1000,
    );
    return now >= boardingStartTime && now <= departureTime;
  }
}

