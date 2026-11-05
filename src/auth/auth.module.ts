import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { MailService } from '../mail/mail.service';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetService } from './password-reset.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '12h' },
    }),
  ],
  controllers: [AuthController, PasswordResetController],
  providers: [AuthService, JwtStrategy, PasswordResetService, MailService],
  exports: [AuthService],
})
export class AuthModule {}
