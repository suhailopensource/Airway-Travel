import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      usernameField: 'email', // Use email instead of username
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<User> {
    try {
      console.log('[LocalStrategy] Validating login for:', email);
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        console.log('[LocalStrategy] User not found:', email);
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('[LocalStrategy] User found, validating password...');
      console.log('[LocalStrategy] User password hash exists:', !!user.password);
      const isPasswordValid = await this.usersService.validatePassword(user, password);
      console.log('[LocalStrategy] Password validation result:', isPasswordValid);
      if (!isPasswordValid) {
        console.log('[LocalStrategy] Password validation failed for:', email);
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('[LocalStrategy] Authentication successful for:', email);
      // Return user without password
      const { password: _, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword as User;
    } catch (error) {
      // Re-throw UnauthorizedException, but log other errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[LocalStrategy] Validation error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

