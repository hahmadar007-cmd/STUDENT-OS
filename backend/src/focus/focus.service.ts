import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FocusGateway } from './focus.gateway';
import { BlocklistType, FocusSessionStatus } from '@prisma/client';

@Injectable()
export class FocusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: FocusGateway,
  ) {}

  // ─── Blocklist ────────────────────────────────────────────────────────────

  async getBlocklist(userId: string) {
    return this.prisma.fascaBlocklist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addToBlocklist(
    userId: string,
    type: BlocklistType,
    value: string,
    label?: string,
  ) {
    const normalised = value.trim().toLowerCase();
    return this.prisma.fascaBlocklist.upsert({
      where: { userId_type_value: { userId, type, value: normalised } },
      update: { label },
      create: { userId, type, value: normalised, label },
    });
  }

  async removeFromBlocklist(userId: string, id: string) {
    const item = await this.prisma.fascaBlocklist.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Blocklist item not found');
    await this.prisma.fascaBlocklist.delete({ where: { id } });
    return { deleted: id };
  }

  // ─── Focus Sessions ───────────────────────────────────────────────────────

  async startSession(
    userId: string,
    dto: {
      totalDurationMs: number;
      numberOfBreaks: number;
      breakDurationMs: number;
      strictMode?: boolean;
    },
  ) {
    // Abort any existing active session first
    await this.prisma.fascaFocusSession.updateMany({
      where: {
        userId,
        status: { in: [FocusSessionStatus.FOCUSING, FocusSessionStatus.ON_BREAK] },
      },
      data: { status: FocusSessionStatus.ABORTED, endTime: new Date() },
    });

    const session = await this.prisma.fascaFocusSession.create({
      data: {
        userId,
        totalDurationMs: dto.totalDurationMs,
        numberOfBreaks: dto.numberOfBreaks,
        breakDurationMs: dto.breakDurationMs,
        strictMode: dto.strictMode ?? false,
        status: FocusSessionStatus.FOCUSING,
      },
    });

    // Broadcast to all connected devices for this user
    this.gateway.broadcastToUser(userId, 'focusStarted', {
      sessionId: session.id,
      totalDurationMs: session.totalDurationMs,
      numberOfBreaks: session.numberOfBreaks,
      breakDurationMs: session.breakDurationMs,
      strictMode: session.strictMode,
      startTime: session.startTime,
    });

    // Schedule break intervals server-side
    this.scheduleBreaks(userId, session.id, session);

    return session;
  }

  async abortSession(userId: string) {
    const session = await this.prisma.fascaFocusSession.findFirst({
      where: {
        userId,
        status: { in: [FocusSessionStatus.FOCUSING, FocusSessionStatus.ON_BREAK] },
      },
    });
    if (!session) throw new NotFoundException('No active session found');

    await this.prisma.fascaFocusSession.update({
      where: { id: session.id },
      data: { status: FocusSessionStatus.ABORTED, endTime: new Date() },
    });

    this.gateway.broadcastToUser(userId, 'focusEnded', { reason: 'ABORTED' });
    return { aborted: session.id };
  }

  async getActiveSession(userId: string) {
    return this.prisma.fascaFocusSession.findFirst({
      where: {
        userId,
        status: { in: [FocusSessionStatus.FOCUSING, FocusSessionStatus.ON_BREAK] },
      },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Schedules break timers and the final end timer on the server.
   * Breaks are spaced evenly across the total study duration.
   */
  private scheduleBreaks(
    userId: string,
    sessionId: string,
    session: {
      totalDurationMs: number;
      numberOfBreaks: number;
      breakDurationMs: number;
    },
  ) {
    const { totalDurationMs, numberOfBreaks, breakDurationMs } = session;

    if (numberOfBreaks === 0) {
      // No breaks – just schedule the end
      setTimeout(() => this.endSession(userId, sessionId), totalDurationMs);
      return;
    }

    // Study time available (excluding all break durations)
    const netStudyMs = totalDurationMs - numberOfBreaks * breakDurationMs;
    const studyChunkMs = Math.floor(netStudyMs / (numberOfBreaks + 1));

    let elapsed = 0;
    for (let i = 0; i < numberOfBreaks; i++) {
      elapsed += studyChunkMs;
      const breakStart = elapsed;
      const breakEnd = elapsed + breakDurationMs;

      // Fire break START
      setTimeout(() => this.triggerBreak(userId, sessionId, i + 1, breakDurationMs), breakStart);
      // Fire break END (resume focus)
      setTimeout(() => this.resumeFocus(userId, sessionId), breakEnd);

      elapsed += breakDurationMs;
    }

    // Fire session end
    elapsed += studyChunkMs;
    setTimeout(() => this.endSession(userId, sessionId), elapsed);
  }

  private async triggerBreak(
    userId: string,
    sessionId: string,
    breakNumber: number,
    durationMs: number,
  ) {
    const breakEndsAt = new Date(Date.now() + durationMs);
    await this.prisma.fascaFocusSession.updateMany({
      where: { id: sessionId, status: FocusSessionStatus.FOCUSING },
      data: {
        status: FocusSessionStatus.ON_BREAK,
        currentBreak: breakNumber,
        breakEndsAt,
      },
    });
    this.gateway.broadcastToUser(userId, 'breakStarted', {
      breakNumber,
      breakDurationMs: durationMs,
      breakEndsAt,
    });
  }

  private async resumeFocus(userId: string, sessionId: string) {
    await this.prisma.fascaFocusSession.updateMany({
      where: { id: sessionId, status: FocusSessionStatus.ON_BREAK },
      data: { status: FocusSessionStatus.FOCUSING, breakEndsAt: null },
    });
    this.gateway.broadcastToUser(userId, 'focusResumed', {});
  }

  private async endSession(userId: string, sessionId: string) {
    await this.prisma.fascaFocusSession.updateMany({
      where: {
        id: sessionId,
        status: { in: [FocusSessionStatus.FOCUSING, FocusSessionStatus.ON_BREAK] },
      },
      data: { status: FocusSessionStatus.COMPLETED, endTime: new Date() },
    });
    this.gateway.broadcastToUser(userId, 'focusEnded', { reason: 'COMPLETED' });
  }
}
