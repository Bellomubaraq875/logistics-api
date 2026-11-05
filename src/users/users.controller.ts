import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/auth.decorators';
import { CreateStaffDto, UpdateStaffDto, UsersService } from './users.service';

@Controller('users')
@Auth(Role.ADMIN)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('staff')
  list() {
    return this.users.list();
  }

  @Post('staff')
  create(@Body() dto: CreateStaffDto) {
    return this.users.create(dto);
  }

  @Patch('staff/:id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.users.update(id, dto);
  }
}
