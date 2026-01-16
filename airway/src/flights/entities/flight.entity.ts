import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  HasMany,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';

export enum FlightStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  IN_AIR = 'IN_AIR',
  COMPLETED = 'COMPLETED',
}

@Table({ tableName: 'flights' })
export class Flight extends Model<Flight> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  flightNumber: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  @ForeignKey(() => User)
  providerId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  source: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  destination: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  departureTime: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  arrivalTime: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  totalSeats: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  availableSeats: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  price: number;

  @Column({
    type: DataType.ENUM,
    values: Object.values(FlightStatus),
    allowNull: false,
    defaultValue: FlightStatus.SCHEDULED,
  })
  status: FlightStatus;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => User, { foreignKey: 'providerId' })
  provider: User;

  @HasMany(() => Booking)
  bookings: Booking[];
}

