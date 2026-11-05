import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { AuthUser } from '../auth/auth.decorators';
import { dateRange } from '../common/date.util';
import { PrismaService } from '../prisma/prisma.service';
import { CheckinDto, CreateTaskDto, ProofDto, UpdateStatusDto, UpdateTaskDto } from './dto/task.dto';

const NEXT: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ['ACCEPTED'],
  ACCEPTED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: ['RETURNED'],
  RETURNED: [],
};
const FINAL: TaskStatus[] = ['DELIVERED', 'FAILED', 'RETURNED'];

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private include = { assignedTo: { select: { id: true, name: true, phone: true } } } satisfies Prisma.TaskInclude;

  private async assertActiveStaff(id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, role: 'STAFF', isActive: true } });
    if (!u) throw new BadRequestException('Assigned user must be an active staff member');
  }

  // ---------- admin ----------
  async create(dto: CreateTaskDto, adminId: string) {
    if (dto.assignedToId) await this.assertActiveStaff(dto.assignedToId);
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        pickupAddress: dto.pickupAddress,
        dropoffAddress: dto.dropoffAddress,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedToId: dto.assignedToId || null,
        createdById: adminId,
      },
      include: this.include,
    });
  }

  list(q: { status?: TaskStatus; staffId?: string; from?: string; to?: string }) {
    const range = dateRange(q.from, q.to);
    return this.prisma.task.findMany({
      where: {
        ...(q.status ? { status: q.status } : {}),
        ...(q.staffId ? { assignedToId: q.staffId } : {}),
        ...(range ? { createdAt: range } : {}),
      },
      include: this.include,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async update(id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (dto.assignedToId !== undefined && task.status !== 'PENDING') {
      throw new BadRequestException('Only pending tasks can be reassigned');
    }
    if (dto.assignedToId) await this.assertActiveStaff(dto.assignedToId);
    const { dueDate, assignedToId, ...rest } = dto;
    return this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
      },
      include: this.include,
    });
  }

  async remove(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'PENDING') throw new BadRequestException('Only pending tasks can be deleted');
    await this.prisma.task.delete({ where: { id } });
    return { deleted: true };
  }

  // ---------- staff ----------
  mine(userId: string) {
    return this.prisma.task.findMany({
      where: { assignedToId: userId },
      include: this.include,
      orderBy: [{ updatedAt: 'desc' }],
      take: 200,
    });
  }

  open() {
    return this.prisma.task.findMany({
      where: { assignedToId: null, status: 'PENDING' },
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, phone: true } },
        events: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true } } } },
        proofs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (user.role === 'STAFF') {
      const isOpen = task.assignedToId === null && task.status === 'PENDING';
      if (task.assignedToId !== user.id && !isOpen) throw new ForbiddenException();
    }
    return task;
  }

  /** Atomic claim: only one staff member can win an open task */
  async claim(id: string, user: AuthUser) {
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.task.updateMany({
        where: { id, assignedToId: null, status: 'PENDING' },
        data: { assignedToId: user.id, status: 'ACCEPTED' },
      });
      if (r.count === 0) throw new ConflictException('Task was already taken or is unavailable');
      await tx.taskEvent.create({
        data: { taskId: id, userId: user.id, status: 'ACCEPTED', note: 'Claimed from open pool' },
      });
    });
    return this.findOne(id, user);
  }

  private async myTask(id: string, user: AuthUser) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.assignedToId !== user.id) throw new ForbiddenException('This task is not assigned to you');
    return task;
  }

  async updateStatus(id: string, user: AuthUser, dto: UpdateStatusDto) {
    const task = await this.myTask(id, user);
    if (!NEXT[task.status].includes(dto.status)) {
      throw new BadRequestException(`Cannot move task from ${task.status} to ${dto.status}`);
    }
    if (dto.status === 'FAILED' && !dto.note?.trim()) {
      throw new BadRequestException('Please give a reason for the failed delivery');
    }
    if (dto.status === 'DELIVERED') {
      const proofs = await this.prisma.proofOfDelivery.count({ where: { taskId: id } });
      if (proofs === 0) throw new BadRequestException('Upload proof of delivery (photo or signature) first');
    }
    await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id },
        data: {
          status: dto.status,
          failureReason: dto.status === 'FAILED' ? dto.note!.trim() : undefined,
          completedAt: FINAL.includes(dto.status) ? new Date() : undefined,
        },
      }),
      this.prisma.taskEvent.create({
        data: {
          taskId: id,
          userId: user.id,
          status: dto.status,
          note: dto.note,
          lat: dto.lat,
          lng: dto.lng,
          accuracy: dto.accuracy,
        },
      }),
    ]);
    return this.findOne(id, user);
  }

  /** "Arrival" style GPS check-in that does not change the status */
  async checkin(id: string, user: AuthUser, dto: CheckinDto) {
    const task = await this.myTask(id, user);
    if (FINAL.includes(task.status) || task.status === 'PENDING') {
      throw new BadRequestException('Check-ins are only allowed on active tasks');
    }
    await this.prisma.taskEvent.create({
      data: {
        taskId: id,
        userId: user.id,
        status: task.status,
        note: dto.note || 'Arrived',
        lat: dto.lat,
        lng: dto.lng,
        accuracy: dto.accuracy,
      },
    });
    return this.findOne(id, user);
  }

  async addProof(id: string, user: AuthUser, file: Express.Multer.File | undefined, dto: ProofDto) {
    const task = await this.myTask(id, user);
    if (!file) throw new BadRequestException('A file is required');
    if (task.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Proof can only be uploaded while the task is In Transit');
    }
    await this.prisma.proofOfDelivery.create({
      data: {
        taskId: id,
        uploadedById: user.id,
        type: dto.type,
        fileUrl: `/uploads/${file.filename}`,
        recipientName: dto.recipientName,
      },
    });
    return this.findOne(id, user);
  }
}
