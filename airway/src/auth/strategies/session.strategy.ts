import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport';

@Injectable()
export class SessionStrategy extends PassportStrategy(Strategy, 'session') {
  constructor() {
    super();
  }

  authenticate(req: any, options?: any) {
    // Passport session middleware automatically populates req.user from session
    // This strategy just verifies that req.user exists
    // Only fail if this strategy is explicitly called (via SessionAuthGuard)
    if (req.user) {
      return this.success(req.user);
    }
    // Don't fail here - let the guard handle it
    // The guard will throw UnauthorizedException if needed
    return this.fail('No session found', 401);
  }
}

