import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth, AuthUser, CurrentUser } from '../auth/auth.decorators';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('summary')
  @Auth(Role.ADMIN)
  summary(@Query('from') from?: string, @Query('to') to?: string, @Query('staffId') staffId?: string) {
    return this.reports.summary(from, to, staffId);
  }

  @Get('my-summary')
  @Auth(Role.STAFF)
  mySummary(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    return this.reports.mySummary(user.id, date);
  }
}
