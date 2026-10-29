import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseStatus, Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { dateRange, dayStart, todayStr } from '../common/date.util';
import { PrismaService } from '../prisma/prisma.service';

export class SubmitExpenseDto {
  @IsDateString() date: string; // YYYY-MM-DD
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() note?: string;
}

export class ReviewExpenseDto {
  @IsEnum(ExpenseStatus) status: ExpenseStatus; // APPROVED | REJECTED
  @IsOptional() @IsString() reviewNote?: string;
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async submit(staffId: string, dto: SubmitExpenseDto) {
    const dateStr = dto.date.slice(0, 10);
    if (dateStr > todayStr()) throw new BadRequestException('You cannot submit an expense for a future date');
    const date = dayStart(dateStr);
    const existing = await this.prisma.dailyExpense.findUnique({
      where: { staffId_date: { staffId, date } },
    });
    if (existing?.status === 'APPROVED') {
      throw new BadRequestException('This expense was already approved and can no longer be changed');
    }
    // Create, or edit/resubmit a pending or rejected entry
    return this.prisma.dailyExpense.upsert({
      where: { staffId_date: { staffId, date } },
      create: { staffId, date, amount: dto.amount, note: dto.note },
      update: {
        amount: dto.amount,
        note: dto.note,
        status: 'PENDING',
        reviewedById: null,
        reviewedAt: null,
        reviewNote: null,
      },
    });
  }

  mine(staffId: string) {
    return this.prisma.dailyExpense.findMany({ where: { staffId }, orderBy: { date: 'desc' }, take: 90 });
  }

  list(q: { status?: ExpenseStatus; staffId?: string; from?: string; to?: string }) {
    const range = dateRange(q.from, q.to);
    const where: Prisma.DailyExpenseWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.staffId ? { staffId: q.staffId } : {}),
      ...(range ? { date: range } : {}),
    };
    return this.prisma.dailyExpense.findMany({
      where,
      include: { staff: { select: { id: true, name: true } } },
      orderBy: [{ date: 'desc' }],
      take: 500,
    });
  }

  async review(id: string, adminId: string, dto: ReviewExpenseDto) {
    if (dto.status === 'PENDING') throw new BadRequestException('Status must be APPROVED or REJECTED');
    const exp = await this.prisma.dailyExpense.findUnique({ where: { id } });
    if (!exp) throw new NotFoundException('Expense not found');
    return this.prisma.dailyExpense.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.reviewNote, reviewedById: adminId, reviewedAt: new Date() },
    });
  }
}
