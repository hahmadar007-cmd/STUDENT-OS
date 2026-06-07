import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  async onModuleInit() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (host && port && user && pass) {
      this.logger.log(`SMTP configured: host=${host}, port=${port}, user=${user}`);
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: {
          user,
          pass,
        },
      });
    } else {
      this.logger.warn('SMTP settings missing in env. Initializing Ethereal test mail fallback...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.logger.log(`Ethereal test account created: user=${testAccount.user}`);
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } catch (err) {
        this.logger.error('Failed to create Ethereal test account. Mail transmission will fail.', err);
      }
    }
  }

  async sendResetCode(email: string, code: string): Promise<void> {
    const from = process.env.SMTP_FROM || 'noreply@studentos.academy';
    const mailOptions = {
      from: `"Fasca Student OS" <${from}>`,
      to: email,
      subject: 'Security Key Recovery - Reset Code',
      text: `Your password recovery verification code is: ${code}\n\nThis code will expire in 15 minutes.`,
      html: `
        <div style="font-family: monospace; background-color: #0a0a0f; color: #f0f0ff; padding: 24px; border: 1px solid #7c5cfc; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #7c5cfc; border-bottom: 1px solid #2a2a3a; padding-bottom: 12px; margin-top: 0;">RECOVER_KEY.tsx</h2>
          <p style="font-size: 12px; color: #6b6b8a; text-transform: uppercase;">Verification code requested for Student OS session:</p>
          <div style="background-color: #16161f; border: 1px dashed #7c5cfc; padding: 16px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 6px; color: #f0f0ff; margin: 20px 0;">
            ${code}
          </div>
          <p style="font-size: 11px; color: #6b6b8a;">This code is valid for 15 minutes. If you did not initiate this request, you can safely ignore this email.</p>
        </div>
      `,
    };

    // Print to console logs for local developer debugging so they can copy it instantly
    this.logger.log('==================================================');
    this.logger.log(`[PASSWORD RESET CODE] TO: ${email} | CODE: ${code}`);
    this.logger.log('==================================================');

    if (!this.transporter) {
      this.logger.warn('Transporter not initialized. Cannot send email.');
      return;
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) {
        this.logger.log(`[Ethereal Fallback] Reset email sent successfully. Preview URL: ${testUrl}`);
      } else {
        this.logger.log(`Reset email sent successfully to ${email}. MessageId: ${info.messageId}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send password recovery email to ${email}`, err);
    }
  }
}
