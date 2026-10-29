import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, TasksModule, ExpensesModule, ReportsModule],
})
export class AppModule {}
