import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CreateStaffDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() @MinLength(6) password: string;
}

export class UpdateStaffDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string; // admin password reset
}

const select = { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({ where: { role: 'STAFF' }, select, orderBy: { name: 'asc' } });
  }

  async create(dto: CreateStaffDto) {
    if (!dto.email && !dto.phone) throw new BadRequestException('Provide an email or a phone number');
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email?.toLowerCase(),
          phone: dto.phone,
          passwordHash: await bcrypt.hash(dto.password, 10),
          role: 'STAFF',
        },
        select,
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Email or phone already in use');
      throw e;
    }
  }

  async update(id: string, dto: UpdateStaffDto) {
    const user = await this.prisma.user.findFirst({ where: { id, role: 'STAFF' } });
    if (!user) throw new NotFoundException('Staff not found');
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email?.toLowerCase(),
          phone: dto.phone,
          isActive: dto.isActive,
          ...(dto.password ? { passwordHash: await bcrypt.hash(dto.password, 10) } : {}),
        },
        select,
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Email or phone already in use');
      throw e;
    }
  }
}
