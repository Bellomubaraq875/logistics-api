import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const GENERIC = 'If an account exists for that email, a reset link has been sent.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  constructor(private prisma: PrismaService, private mail: MailService) {}

  // Only a SHA-256 hash of the token is stored, so a database leak can't be used to reset passwords.
  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Always returns the same message, so attackers can't discover which emails have accounts. */
  async request(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && user.isActive && user.email) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }), // one live link at a time
        this.prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: this.hash(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
        }),
      ]);
      const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      // not awaited, so response time doesn't reveal whether the account exists
      this.mail
        .sendPasswordReset(user.email, user.name, `${base}/reset-password?token=${token}`)
        .catch((e) => this.logger.error(`Failed to send reset email: ${e?.message || e}`));
    }
    return { message: GENERIC };
  }

  async reset(token: string, password: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: this.hash(token) } });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired. Please request a new one.');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }), // link is single-use
    ]);
    return { message: 'Password updated. You can now sign in.' };
  }
}
