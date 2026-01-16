import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UsersService } from '../users/users.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private usersService: UsersService) {
    super();
  }

  serializeUser(user: any, done: (err: Error, user: any) => void): void {
    // Store only user ID in session
    done(null, user.id);
  }

  async deserializeUser(id: string, done: (err: Error, user: any) => void): Promise<void> {
    try {
      // Fetch full user from database using ID stored in session
      const user = await this.usersService.findById(id);
      if (!user) {
        return done(new Error('User not found'), null);
      }
      // Return user without password
      const { password: _, ...userWithoutPassword } = user.toJSON();
      done(null, userWithoutPassword);
    } catch (err) {
      done(err, null);
    }
  }
}

