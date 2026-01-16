import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { Flight } from '../../flights/entities/flight.entity';

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  BOARDED = 'BOARDED',
  NOT_BOARDED = 'NOT_BOARDED',
}

@Table({ tableName: 'bookings' })
export class Booking extends Model<Booking> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  @ForeignKey(() => User)
  userId: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  @ForeignKey(() => Flight)
  flightId: string;

  @Column({
    type: DataType.UUID,
    allowNull: true, // Allow null for backward compatibility with existing data
  })
  @ForeignKey(() => User)
  providerId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true, // Allow null for backward compatibility
  })
  providerName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true, // Allow null for backward compatibility
  })
  providerEmail: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'seatcount', // Map to database column name
  })
  seatCount: number;

  @Column({
    type: DataType.ENUM,
    values: Object.values(BookingStatus),
    allowNull: false,
    defaultValue: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  totalPrice: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'bookedat', // Map to database column name
  })
  bookedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Flight)
  flight: Flight;

  @BelongsTo(() => User, { foreignKey: 'providerId' })
  provider: User;
}

