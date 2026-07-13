import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FocusService } from './focus.service';
import { BlocklistType } from '@prisma/client';

@Controller('focus')
export class FocusController {
  constructor(
    private readonly focusService: FocusService,
    private readonly jwtService: JwtService,
  ) {}

  private extractUserId(authHeader?: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing auth token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'fasca-obsidian-secret-key-1337',
      }) as { sub: string };
      return decoded.sub;
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  // ─── Blocklist ────────────────────────────────────────────────────────────

  @Get('blocklist')
  getBlocklist(@Headers('authorization') auth?: string) {
    const userId = this.extractUserId(auth);
    return this.focusService.getBlocklist(userId);
  }

  @Post('blocklist')
  addToBlocklist(
    @Headers('authorization') auth: string,
    @Body() body: { type: BlocklistType; value: string; label?: string },
  ) {
    const userId = this.extractUserId(auth);
    return this.focusService.addToBlocklist(userId, body.type, body.value, body.label);
  }

  @Delete('blocklist/:id')
  @HttpCode(HttpStatus.OK)
  removeFromBlocklist(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    const userId = this.extractUserId(auth);
    return this.focusService.removeFromBlocklist(userId, id);
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  @Get('session/active')
  getActiveSession(@Headers('authorization') auth?: string) {
    const userId = this.extractUserId(auth);
    return this.focusService.getActiveSession(userId);
  }

  @Post('session/start')
  startSession(
    @Headers('authorization') auth: string,
    @Body()
    body: {
      totalDurationMs: number;
      numberOfBreaks: number;
      breakDurationMs: number;
      strictMode?: boolean;
    },
  ) {
    const userId = this.extractUserId(auth);
    return this.focusService.startSession(userId, body);
  }

  @Post('session/abort')
  @HttpCode(HttpStatus.OK)
  abortSession(@Headers('authorization') auth: string) {
    const userId = this.extractUserId(auth);
    return this.focusService.abortSession(userId);
  }
}
