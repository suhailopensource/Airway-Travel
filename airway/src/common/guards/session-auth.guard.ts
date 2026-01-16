import { Injectable, ExecutionContext, UnauthorizedException, CanActivate } from '@nestjs/common';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // passport.session() middleware populates req.user from session
    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }
}


