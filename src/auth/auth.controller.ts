import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { Auth, AuthUser, CurrentUser } from './auth.decorators';

class LoginDto {
  @IsString() @IsNotEmpty() identifier: string; // email or phone
  @IsString() @IsNotEmpty() password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.identifier, dto.password);
  }

  @Get('me')
  @Auth()
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
