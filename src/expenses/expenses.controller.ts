import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ExpenseStatus, Role } from '@prisma/client';
import { Auth, AuthUser, CurrentUser } from '../auth/auth.decorators';
import { ExpensesService, ReviewExpenseDto, SubmitExpenseDto } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private expenses: ExpensesService) {}

  @Post()
  @Auth(Role.STAFF)
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitExpenseDto) {
    return this.expenses.submit(user.id, dto);
  }

  @Get('mine')
  @Auth(Role.STAFF)
  mine(@CurrentUser() user: AuthUser) {
    return this.expenses.mine(user.id);
  }

  @Get()
  @Auth(Role.ADMIN)
  list(
    @Query('status') status?: ExpenseStatus,
    @Query('staffId') staffId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (status && !Object.values(ExpenseStatus).includes(status)) throw new BadRequestException('Invalid status');
    return this.expenses.list({ status, staffId, from, to });
  }

  @Patch(':id/review')
  @Auth(Role.ADMIN)
  review(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReviewExpenseDto) {
    return this.expenses.review(id, user.id, dto);
  }
}
