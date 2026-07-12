import { Controller, Get, Post, Body, Headers, UnauthorizedException, Param, Delete } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { JwtService } from '@nestjs/jwt';

@Controller('diary')
export class DiaryController {
  constructor(
    private readonly diaryService: DiaryService,
    private readonly jwtService: JwtService,
  ) {}

  private extractUserId(authHeader?: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing auth token');
    }
    const token = authHeader.split(' ')[1];
    try {
      // Decode the standard auth token (we use the fallback-secret if not provided in register)
      const decoded = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'fallback-secret' });
      return decoded.sub;
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private verifyDiaryAccess(diaryHeader?: string): string {
    if (!diaryHeader || !diaryHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing diary token');
    }
    const token = diaryHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'fallback-secret' });
      if (!decoded.diaryAccess) throw new UnauthorizedException('Invalid diary token');
      return decoded.sub;
    } catch {
      throw new UnauthorizedException('Diary authentication failed');
    }
  }

  @Get('status')
  async getStatus(@Headers('authorization') authHeader?: string) {
    const userId = this.extractUserId(authHeader);
    return this.diaryService.getStatus(userId);
  }

  @Post('setup-pin')
  async setupPin(
    @Body() body: { pin: string },
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.extractUserId(authHeader);
    return this.diaryService.setupPin(userId, body.pin);
  }

  @Post('verify-pin')
  async verifyPin(
    @Body() body: { pin: string },
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.extractUserId(authHeader);
    return this.diaryService.verifyPin(userId, body.pin);
  }

  // --- Protected Diary Routes ---

  @Get()
  async getEntries(@Headers('x-diary-token') diaryHeader?: string) {
    const userId = this.verifyDiaryAccess(diaryHeader);
    return this.diaryService.findAllEntries(userId);
  }

  @Post()
  async createEntry(
    @Body() body: { title: string; content: string },
    @Headers('x-diary-token') diaryHeader?: string,
  ) {
    const userId = this.verifyDiaryAccess(diaryHeader);
    return this.diaryService.createEntry(userId, body.title, body.content);
  }

  @Delete(':id')
  async deleteEntry(
    @Param('id') id: string,
    @Headers('x-diary-token') diaryHeader?: string,
  ) {
    const userId = this.verifyDiaryAccess(diaryHeader);
    return this.diaryService.deleteEntry(userId, id);
  }
}
