import { ProofType, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTaskDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsString() @IsNotEmpty() pickupAddress: string;
  @IsString() @IsNotEmpty() dropoffAddress: string;
  @IsString() @IsNotEmpty() customerName: string;
  @IsString() @IsNotEmpty() customerPhone: string;
  @IsOptional() @IsDateString() dueDate?: string;
  /** Leave empty to post the task to the open pool */
  @IsOptional() @IsString() assignedToId?: string;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @IsNotEmpty() pickupAddress?: string;
  @IsOptional() @IsString() @IsNotEmpty() dropoffAddress?: string;
  @IsOptional() @IsString() @IsNotEmpty() customerName?: string;
  @IsOptional() @IsString() @IsNotEmpty() customerPhone?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  /** string = assign to staff, null = move back to open pool (only while PENDING) */
  @IsOptional() @IsString() assignedToId?: string | null;
}

export class UpdateStatusDto {
  @IsEnum(TaskStatus) status: TaskStatus;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() accuracy?: number;
  /** Required when status = FAILED (used as the failure reason) */
  @IsOptional() @IsString() note?: string;
}

export class CheckinDto {
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng: number;
  @IsOptional() @Type(() => Number) @IsNumber() accuracy?: number;
  @IsOptional() @IsString() note?: string;
}

export class ProofDto {
  @IsEnum(ProofType) type: ProofType;
  @IsOptional() @IsString() recipientName?: string;
}
