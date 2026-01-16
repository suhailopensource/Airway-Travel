import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get API welcome message',
    description: 'Returns a welcome message indicating the API is running'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Welcome message',
    schema: {
      example: 'Airway Management System API is running!'
    }
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Health check endpoint',
    description: 'Returns the health status of the API and connected services'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health status',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  getHealth() {
    return this.appService.getHealth();
  }
}

