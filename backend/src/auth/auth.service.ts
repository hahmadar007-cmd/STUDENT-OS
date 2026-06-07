import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  universityId: string | null;
  createdAt: Date;
  updatedAt: Date;
  fouzarId: string | null;
  avatarUrl: string | null;
};

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private resetCodes = new Map<string, { code: string; expiresAt: Date }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: SafeUser }> {
    const { email, name, universityName, password } = dto;

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const university = await tx.university.upsert({
          where: { name: universityName },
          update: {},
          create: { name: universityName },
        });

        // Generate a unique 6-digit numeric ID
        let fouzarId = '';
        let attempts = 0;
        while (attempts < 10) {
          const candidate = Math.floor(100000 + Math.random() * 900000).toString();
          const existing = await tx.user.findUnique({
            where: { fouzarId: candidate },
          });
          if (!existing) {
            fouzarId = candidate;
            break;
          }
          attempts++;
        }
        if (!fouzarId) {
          throw new Error('Failed to generate a unique connection ID after 10 attempts');
        }

        return tx.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            universityId: university.id,
            fouzarId,
          },
          select: {
            id: true,
            email: true,
            name: true,
            universityId: true,
            createdAt: true,
            updatedAt: true,
            fouzarId: true,
            avatarUrl: true,
          },
        });
      });

      const token = this.jwtService.sign({ sub: user.id, email: user.email });

      return {
        accessToken: token,
        user,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const fields = (error.meta?.target as string[])?.join(', ');
        throw new ConflictException(
          `An account with this ${fields ?? 'email'} already exists.`,
        );
      }

      this.logger.error('Unexpected registration error', {
        error,
        email,
      });
      throw new InternalServerErrorException(
        'Registration failed. Please try again later.',
      );
    }
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: SafeUser }> {
    const { email, password } = dto;
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or security key.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or security key.');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        universityId: user.universityId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        fouzarId: user.fouzarId,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('No account found matching this email address.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    this.resetCodes.set(email.toLowerCase(), { code, expiresAt });

    await this.emailService.sendResetCode(email, code);
  }

  async resetPassword(dto: any): Promise<void> {
    const { email, code, newPassword } = dto;
    const lowerEmail = email.toLowerCase();
    const record = this.resetCodes.get(lowerEmail);

    if (!record) {
      throw new UnauthorizedException('No verification code was requested for this email.');
    }

    if (record.code !== code) {
      throw new UnauthorizedException('Invalid verification code.');
    }

    if (new Date() > record.expiresAt) {
      this.resetCodes.delete(lowerEmail);
      throw new UnauthorizedException('Verification code has expired.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { email: lowerEmail },
      data: { password: hashedPassword },
    });

    this.resetCodes.delete(lowerEmail);
  }
}