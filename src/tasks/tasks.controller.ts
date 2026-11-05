import {
  BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role, TaskStatus } from '@prisma/client';
import { Auth, AuthUser, CurrentUser } from '../auth/auth.decorators';
import { proofUploadOptions } from '../common/upload';
import { CheckinDto, CreateTaskDto, ProofDto, UpdateStatusDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private tasks: TasksService) {}

  // ----- admin -----
  @Post()
  @Auth(Role.ADMIN)
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasks.create(dto, user.id);
  }

  @Get()
  @Auth(Role.ADMIN)
  list(
    @Query('status') status?: TaskStatus,
    @Query('staffId') staffId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (status && !Object.values(TaskStatus).includes(status)) throw new BadRequestException('Invalid status');
    return this.tasks.list({ status, staffId, from, to });
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto);
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.tasks.remove(id);
  }

  // ----- staff (static routes must come before ':id') -----
  @Get('mine')
  @Auth(Role.STAFF)
  mine(@CurrentUser() user: AuthUser) {
    return this.tasks.mine(user.id);
  }

  @Get('open')
  @Auth(Role.STAFF)
  open() {
    return this.tasks.open();
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasks.findOne(id, user);
  }

  @Post(':id/claim')
  @Auth(Role.STAFF)
  claim(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasks.claim(id, user);
  }

  @Post(':id/status')
  @Auth(Role.STAFF)
  updateStatus(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateStatusDto) {
    return this.tasks.updateStatus(id, user, dto);
  }

  @Post(':id/checkin')
  @Auth(Role.STAFF)
  checkin(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: CheckinDto) {
    return this.tasks.checkin(id, user, dto);
  }

  @Post(':id/proof')
  @Auth(Role.STAFF)
  @UseInterceptors(FileInterceptor('file', proofUploadOptions))
  addProof(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ProofDto,
  ) {
    return this.tasks.addProof(id, user, file, dto);
  }
}
