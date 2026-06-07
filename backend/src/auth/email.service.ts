import { Injectable, Logger } from '@nestjs/common';  
import * as nodemailer from 'nodemailer';  
  
@Injectable()  
export class EmailService {  
  private readonly logger = new Logger(EmailService.name);  
  private transporter: nodemailer.Transporter;  
  
  constructor() {  
    this.transporter = nodemailer.createTransport({  
      host: process.env.SMTP_HOST || 'smtp.gmail.com',  
      port: parseInt(process.env.SMTP_PORT || '587'),  
      secure: false,  
      auth: {  
        user: process.env.SMTP_USER,  
        pass: process.env.SMTP_PASS,  
      },  
    });  
  }  
  
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {  
    const frontendUrl = process.env.FRONTEND_URL || 'https://student-os-frontend.vercel.app';  
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;  
  
    // Print to console log for easy local development testing
    this.logger.log('==================================================');
    this.logger.log(`[PASSWORD RESET LINK] TO: ${to}`);
    this.logger.log(`LINK: ${resetLink}`);
    this.logger.log('==================================================');

    await this.transporter.sendMail({  
      from: `"Student OS" <${process.env.SMTP_USER}>`,  
      to,  
      subject: 'Reset your Student OS password',  
      html: `  
        <div style="font-family: monospace; background: #0a0a0f; color: #f0f0ff; padding: 32px; max-width: 480px;">  
          <h2 style="color: #7c5cfc; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase;">Password Reset</h2>  
          <p style="font-size: 12px; color: #a0a0c0;">Click the link below to reset your password. This link expires in 1 hour.</p>  
          <a href="${resetLink}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #7c5cfc; color: #fff; text-decoration: none; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;">Reset Password</a>  
          <p style="font-size: 10px; color: #6b6b8a;">If you didn't request this, ignore this email.</p>  
        </div>  
      `,  
    });  
  }  
}
