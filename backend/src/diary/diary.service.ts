import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class DiaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { hasSetPin: !!user.diaryPin };
  }

  async setupPin(userId: string, pin: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.diaryPin) {
      throw new BadRequestException('Diary PIN is already set');
    }

    const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { diaryPin: hashedPin },
    });
    return { success: true };
  }

  async changePin(userId: string, oldPin: string, newPin: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.diaryPin) {
      throw new BadRequestException('Diary PIN not set up');
    }

    const isValid = await bcrypt.compare(oldPin, user.diaryPin);
    if (!isValid) {
      throw new UnauthorizedException('Invalid current passcode');
    }

    const hashedPin = await bcrypt.hash(newPin, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { diaryPin: hashedPin },
    });
    return { success: true };
  }

  async verifyPin(userId: string, pin: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.diaryPin) {
      throw new BadRequestException('Diary PIN not set up');
    }

    const isValid = await bcrypt.compare(pin, user.diaryPin);
    if (!isValid) {
      throw new UnauthorizedException('Invalid PIN');
    }

    // Sign a short-lived token specifically for diary access
    const diaryToken = this.jwtService.sign(
      { sub: userId, diaryAccess: true },
      { secret: process.env.JWT_SECRET || 'fallback-secret', expiresIn: '1h' },
    );

    return { diaryToken };
  }

  async createEntry(userId: string, title: string, content: string) {
    return this.prisma.diaryEntry.create({
      data: {
        title,
        content,
        userId,
      },
    });
  }

  async findAllEntries(userId: string) {
    return this.prisma.diaryEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteEntry(userId: string, entryId: string) {
    const entry = await this.prisma.diaryEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.userId !== userId) throw new UnauthorizedException('Access denied');

    await this.prisma.diaryEntry.delete({
      where: { id: entryId },
    });
    return { success: true };
  }
}
