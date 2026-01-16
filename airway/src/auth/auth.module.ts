import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { SessionSerializer } from './serializers';
import { LocalAuthGuard } from './strategies/local-auth.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ session: true }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, SessionSerializer, LocalAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}

