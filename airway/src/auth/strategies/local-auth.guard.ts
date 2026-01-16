import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Call parent canActivate which will trigger LocalStrategy
    const result = (await super.canActivate(context)) as boolean;
    return result;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Log for debugging
    if (err || !user) {
      console.error('[LocalAuthGuard] handleRequest - Auth failed:', {
        err: err?.message || err,
        hasUser: !!user,
        info: info?.message || info,
      });
      throw err || new UnauthorizedException('Invalid credentials');
    }
    console.log('[LocalAuthGuard] handleRequest - Auth successful for:', user.email);
    return user;
  }
}

