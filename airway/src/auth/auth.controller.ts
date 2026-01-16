import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';
import { LocalAuthGuard } from './strategies/local-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Creates a new user account. Supports both USER and AIRWAY_PROVIDER roles. Automatically logs in the user after registration.'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully and logged in',
    schema: {
      example: {
        id: 'uuid',
        email: 'john.doe@example.com',
        name: 'John Doe',
        role: 'USER'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data or email already exists' })
  async register(@Body() registerDto: RegisterDto, @Request() req) {
    const user = await this.authService.register(registerDto);
    // Auto-login after registration using passport
    return new Promise((resolve, reject) => {
      req.login(user, (err) => {
        if (err) {
          reject(err);
        } else {
          // User from register already has password removed
          resolve(user);
        }
      });
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ 
    summary: 'Login user',
    description: 'Authenticates user using email and password. Creates a session and returns user information.'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      example: {
        id: 'uuid',
        email: 'john.doe@example.com',
        name: 'John Doe',
        role: 'USER'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
  async login(@Request() req) {
    // User is attached to request by passport-local strategy after validation
    // We need to explicitly call req.login() to establish the session
    if (!req.user) {
      throw new UnauthorizedException('Authentication failed');
    }
    
    return new Promise((resolve, reject) => {
      req.login(req.user, (err) => {
        if (err) {
          console.error('Login error:', err);
          reject(err);
        } else {
          // Password is already removed by LocalStrategy
          // Session is now established
          resolve(req.user);
        }
      });
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ 
    summary: 'Logout user',
    description: 'Destroys the current session and logs out the user.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout successful',
    schema: {
      example: {
        message: 'Logged out successfully'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Request() req) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ message: 'Logged out successfully' });
        }
      });
    });
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ 
    summary: 'Get current user',
    description: 'Returns the currently authenticated user from the session.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Current user information',
    schema: {
      example: {
        id: 'uuid',
        email: 'john.doe@example.com',
        name: 'John Doe',
        role: 'USER'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - No active session' })
  async getCurrentUser(@CurrentUser() user: User) {
    return user;
  }
}

