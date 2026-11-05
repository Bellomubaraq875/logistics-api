import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { dateRange, dayEnd, dayStart, todayStr } from '../common/date.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /** Per-staff performance. Tasks are filtered by creation date, expenses by expense date (approved only). */
  async summary(from?: string, to?: string, staffId?: string) {
    const range = dateRange(from, to);
    const taskWhere: Prisma.TaskWhereInput = {
      assignedToId: staffId ?? { not: null },
      ...(range ? { createdAt: range } : {}),
    };
    const expWhere: Prisma.DailyExpenseWhereInput = {
      status: 'APPROVED',
      ...(staffId ? { staffId } : {}),
      ...(range ? { date: range } : {}),
    };

    const [grouped, expenses, staff] = await Promise.all([
      this.prisma.task.groupBy({ by: ['assignedToId', 'status'], where: taskWhere, _count: { _all: true } }),
      this.prisma.dailyExpense.groupBy({ by: ['staffId'], where: expWhere, _sum: { amount: true } }),
      this.prisma.user.findMany({
        where: { role: 'STAFF', ...(staffId ? { id: staffId } : {}) },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const rows = staff.map((s) => {
      const count = (status: string) =>
        grouped.find((g) => g.assignedToId === s.id && g.status === status)?._count._all ?? 0;
      const delivered = count('DELIVERED');
      const failed = count('FAILED');
      const returned = count('RETURNED');
      const total = grouped.filter((g) => g.assignedToId === s.id).reduce((n, g) => n + g._count._all, 0);
      const closed = delivered + failed + returned;
      const approvedExpenses = Number(expenses.find((e) => e.staffId === s.id)?._sum.amount ?? 0);
      return {
        staffId: s.id,
        name: s.name,
        total,
        delivered,
        failed,
        returned,
        inProgress: total - closed,
        successRate: closed ? Math.round((delivered / closed) * 1000) / 10 : null,
        approvedExpenses,
        expensePerDelivery: delivered ? Math.round((approvedExpenses / delivered) * 100) / 100 : null,
      };
    });

    const totals = rows.reduce(
      (t, r) => ({
        total: t.total + r.total,
        delivered: t.delivered + r.delivered,
        failed: t.failed + r.failed,
        returned: t.returned + r.returned,
        approvedExpenses: t.approvedExpenses + r.approvedExpenses,
      }),
      { total: 0, delivered: 0, failed: 0, returned: 0, approvedExpenses: 0 },
    );
    const closed = totals.delivered + totals.failed + totals.returned;
    return {
      rows,
      totals: { ...totals, successRate: closed ? Math.round((totals.delivered / closed) * 1000) / 10 : null },
    };
  }

  /** Staff daily summary card */
  async mySummary(userId: string, date: string = todayStr()) {
    const range = { gte: dayStart(date), lte: dayEnd(date) };
    const [delivered, failed, active, expense] = await Promise.all([
      this.prisma.taskEvent.count({ where: { userId, status: 'DELIVERED', createdAt: range } }),
      this.prisma.taskEvent.count({ where: { userId, status: 'FAILED', createdAt: range } }),
      this.prisma.task.count({
        where: { assignedToId: userId, status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] } },
      }),
      this.prisma.dailyExpense.findUnique({ where: { staffId_date: { staffId: userId, date: dayStart(date) } } }),
    ]);
    return { date, delivered, failed, active, expense };
  }
}
