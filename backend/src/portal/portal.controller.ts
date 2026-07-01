import { Controller, Get, Post, Patch, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Controller('portal')
export class PortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('status')
  async getPortalStatus(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const profile = await this.prisma.studentPortalProfile.findUnique({
        where: { userId: decoded.sub },
      });
      return {
        connected: !!profile,
        portalUrl: profile?.portalUrl ?? null,
        portalType: profile?.portalType ?? null,
        studentId: profile?.studentId ?? null,
        gpa: profile?.gpa ?? null,
        cgpa: profile?.cgpa ?? null,
        semester: profile?.semester ?? null,
        syncStatus: profile?.syncStatus ?? 'never',
      };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Patch('connect')
  async connectPortal(
    @Headers('authorization') authHeader: string,
    @Body() body: { portalUrl: string; portalType: string; studentId: string }
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      await this.prisma.studentPortalProfile.upsert({
        where: { userId: decoded.sub },
        update: {
          portalUrl: body.portalUrl,
          portalType: body.portalType,
          studentId: body.studentId,
          syncStatus: 'connected',
          syncError: null,
          lastSyncedAt: new Date(),
        },
        create: {
          userId: decoded.sub,
          portalUrl: body.portalUrl,
          portalType: body.portalType,
          studentId: body.studentId,
          syncStatus: 'connected',
          lastSyncedAt: new Date(),
        },
      });
      return { success: true };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Get('profile')
  async getPortalProfile(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.prisma.studentPortalProfile.findUnique({
        where: { userId: decoded.sub },
        include: { attendance: true, transcript: true },
      });
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post('attendance')
  async savePortalAttendance(
    @Headers('authorization') authHeader: string,
    @Body() body: { attendance: Array<{ subjectCode?: string; subjectName: string; total: number; attended: number; percentage: number }> }
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const profile = await this.prisma.studentPortalProfile.upsert({
        where: { userId: decoded.sub },
        update: {},
        create: { userId: decoded.sub, syncStatus: 'connected' },
      });
      await this.prisma.attendanceStat.deleteMany({ where: { profileId: profile.id } });
      const rows = (body.attendance ?? [])
        .filter((row) => row.subjectName?.trim())
        .map((row) => ({
          profileId: profile.id,
          subjectCode: row.subjectCode?.trim() ?? '',
          subjectName: row.subjectName.trim(),
          total: Number(row.total) || 0,
          attended: Number(row.attended) || 0,
          percentage: Number(row.percentage) || 0,
        }));
      if (rows.length > 0) {
        await this.prisma.attendanceStat.createMany({ data: rows });
      }
      return { success: true, count: rows.length };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post('transcript')
  async savePortalTranscript(
    @Headers('authorization') authHeader: string,
    @Body() body: { transcript: Array<{ subjectCode?: string; subjectName: string; creditHours?: number; grade?: string; gradePoints?: number | null; semester?: string }> }
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const profile = await this.prisma.studentPortalProfile.upsert({
        where: { userId: decoded.sub },
        update: {},
        create: { userId: decoded.sub, syncStatus: 'connected' },
      });
      await this.prisma.transcriptEntry.deleteMany({ where: { profileId: profile.id } });
      const rows = (body.transcript ?? [])
        .filter((row) => row.subjectName?.trim())
        .map((row) => ({
          profileId: profile.id,
          subjectCode: row.subjectCode?.trim() ?? '',
          subjectName: row.subjectName.trim(),
          creditHours: Number(row.creditHours) || 3,
          grade: row.grade?.trim() || null,
          gradePoints: row.gradePoints === null || row.gradePoints === undefined || row.gradePoints === '' as any
            ? null
            : Number(row.gradePoints),
          semester: row.semester?.trim() || null,
        }));
      if (rows.length > 0) {
        await this.prisma.transcriptEntry.createMany({ data: rows });
      }
      return { success: true, count: rows.length };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Patch('gpa')
  async savePortalGpa(
    @Headers('authorization') authHeader: string,
    @Body() body: { gpa: number | null; cgpa: number | null; semester: string }
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      await this.prisma.studentPortalProfile.upsert({
        where: { userId: decoded.sub },
        update: {
          gpa: body.gpa === null ? null : Number(body.gpa),
          cgpa: body.cgpa === null ? null : Number(body.cgpa),
          semester: body.semester,
        },
        create: {
          userId: decoded.sub,
          gpa: body.gpa === null ? null : Number(body.gpa),
          cgpa: body.cgpa === null ? null : Number(body.cgpa),
          semester: body.semester,
          syncStatus: 'connected',
        },
      });
      return { success: true };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
