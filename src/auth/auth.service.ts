import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(identifier: string, password: string) {
    const id = identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: id.toLowerCase() }, { phone: id }] },
    });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { accessToken, user: this.publicUser(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.publicUser(user);
  }

  private publicUser(u: { id: string; name: string; email: string | null; phone: string | null; role: string }) {
    return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
  }
}
