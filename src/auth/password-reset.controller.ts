import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { PasswordResetService } from './password-reset.service';

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class ResetPasswordDto {
  @IsString() @IsNotEmpty() token: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string; // bcrypt ignores anything past 72 bytes
}

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class PasswordResetController {
  constructor(private reset: PasswordResetService) {}

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 requests per minute per IP
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.reset.request(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.reset.reset(dto.token, dto.password);
  }
}
