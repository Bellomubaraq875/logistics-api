import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /** Works with any SMTP provider: Gmail (app password), Resend SMTP, Brevo, etc. */
  private transporter() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
    const port = Number(SMTP_PORT || 465);
    return nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  }

  async sendPasswordReset(to: string, name: string, link: string) {
    const transport = this.transporter();
    if (!transport) {
      // Email not configured yet: in development, print the link so you can still test the flow.
      this.logger.warn('SMTP is not configured, so no email was sent.');
      if (process.env.NODE_ENV !== 'production') this.logger.warn(`DEV reset link for ${to}: ${link}`);
      return;
    }
    const from = process.env.MAIL_FROM || process.env.SMTP_USER!;
    await transport.sendMail({
      from,
      to,
      subject: 'Reset your Logistics Tracker password',
      text:
        `Hi ${name},\n\nWe received a request to reset your password. ` +
        `Use this link within 30 minutes:\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
      html: `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#064e3b">
  <h2 style="margin:0 0 12px">Reset your password</h2>
  <p>Hi ${esc(name)},</p>
  <p>We received a request to reset your Logistics Tracker password. This link works for <b>30 minutes</b>.</p>
  <p style="margin:24px 0"><a href="${esc(link)}" style="background:#10b981;color:#022c22;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:700">Choose a new password</a></p>
  <p style="font-size:13px;color:#4b5563">Button not working? Paste this link into your browser:<br>${esc(link)}</p>
  <p style="font-size:13px;color:#4b5563">If you didn't ask for this, you can safely ignore this email.</p>
</div>`,
    });
  }
}
