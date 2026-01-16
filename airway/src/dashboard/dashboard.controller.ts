import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { UserDashboardDto } from './dto/user-dashboard.dto';
import { ProviderDashboardDto } from './dto/provider-dashboard.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(SessionAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('user')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get user dashboard',
    description: 'Returns total bookings, upcoming flights, and past flights for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User dashboard data',
    type: UserDashboardDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - USER role required' })
  getUserDashboard(@CurrentUser() user: User): Promise<UserDashboardDto> {
    return this.dashboardService.getUserDashboard(user.id);
  }

  @Get('provider')
  @Roles(Role.AIRWAY_PROVIDER)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get airway provider dashboard',
    description: 'Returns total flights, total seats, booked seats, and boarding count per flight for the authenticated provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider dashboard data',
    type: ProviderDashboardDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - AIRWAY_PROVIDER role required' })
  getProviderDashboard(@CurrentUser() user: User): Promise<ProviderDashboardDto> {
    return this.dashboardService.getProviderDashboard(user.id);
  }
}

