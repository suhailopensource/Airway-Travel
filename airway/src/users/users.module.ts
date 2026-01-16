import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    BookingsModule, // Import BookingsModule to use BookingsService
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

