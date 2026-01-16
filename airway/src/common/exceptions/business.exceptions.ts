import { BadRequestException } from '@nestjs/common';

export class FlightDepartedException extends BadRequestException {
  constructor(message = 'Flight has already departed. Booking is not allowed.') {
    super(message);
  }
}

export class FlightInAirException extends BadRequestException {
  constructor(message = 'Flight is currently in air. Booking is not allowed.') {
    super(message);
  }
}

export class FlightCompletedException extends BadRequestException {
  constructor(message = 'Flight has been completed. Booking is not allowed.') {
    super(message);
  }
}

export class BookingClosedException extends BadRequestException {
  constructor(message = 'Booking is closed. Cannot perform this operation.') {
    super(message);
  }
}

export class InvalidTimeWindowException extends BadRequestException {
  constructor(message = 'Invalid time window for this operation.') {
    super(message);
  }
}

export class InsufficientSeatsException extends BadRequestException {
  constructor(available: number, requested: number) {
    super(
      `Insufficient seats available. Available: ${available}, Requested: ${requested}`,
    );
  }
}

export class InvalidDepartureTimeException extends BadRequestException {
  constructor(message = 'Departure time must be in the future.') {
    super(message);
  }
}

export class InvalidArrivalTimeException extends BadRequestException {
  constructor(message = 'Arrival time must be after departure time.') {
    super(message);
  }
}

export class FlightSchedulingConflictException extends BadRequestException {
  constructor(flightNumber: string) {
    super(
      `Flight number ${flightNumber} already exists with an overlapping schedule. Please choose a different time or flight number.`,
    );
  }
}

