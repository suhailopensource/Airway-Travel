import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Creates a new user account. Supports both USER and AIRWAY_PROVIDER roles.'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    schema: {
      example: {
        id: 'uuid',
        email: 'john.doe@example.com',
        name: 'John Doe',
        role: 'USER',
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: '24h'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data or email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'Login user',
    description: 'Authenticates user and returns JWT access token with expiration information'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: '24h',
        user: {
          id: 'uuid',
          email: 'john.doe@example.com',
          name: 'John Doe',
          role: 'USER'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('validate-token')
  @ApiOperation({ 
    summary: 'Validate JWT token',
    description: 'Check if a JWT token is valid and not expired. Returns token validity status.'
  })
  @ApiQuery({ 
    name: 'token', 
    required: true, 
    description: 'JWT token to validate',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token validation result',
    schema: {
      example: {
        valid: true,
        expired: false
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Token not provided' })
  async validateToken(@Query('token') token: string) {
    return this.authService.validateToken(token);
  }
}

