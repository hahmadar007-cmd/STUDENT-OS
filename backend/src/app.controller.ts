import { Controller, Get, Post, Patch, Body, Headers, UnauthorizedException, Res, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LmsService } from './lms/lms.service';
import { encrypt, decrypt } from './utils/crypto';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly lmsService: LmsService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('videos')
  async addVideo(
    @Headers('authorization') authHeader: string,
    @Body() body: { url: string; title: string; folderId: string }
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    let userId = '';
    try {
      const decoded = this.jwtService.verify(token);
      userId = decoded.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return this.prisma.subjectVideo.create({
      data: {
        url: body.url,
        title: body.title,
        folderId: body.folderId,
        userId,
      },
    });
  }

  @Get('videos/:folderId')
  async getVideos(
    @Headers('authorization') authHeader: string,
    @Param('folderId') folderId: string
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    let userId = '';
    try {
      const decoded = this.jwtService.verify(token);
      userId = decoded.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return this.prisma.subjectVideo.findMany({
      where: { userId, folderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (e) {
      return { status: 'degraded', database: 'disconnected', error: String(e) };
    }
  }

  @Get('debug/env')
  debugEnv() {
    return {
      hasDb: !!process.env.DATABASE_URL,
      dbPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) : null,
      hasDirect: !!process.env.DIRECT_URL,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      keys: Object.keys(process.env)
    };
  }

  @Get('test/db')
  async testDb(@Headers('authorization') authHeader?: string) {
    // Restrict user count disclosure to admin accounts only
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid auth token');
    }
    const token = authHeader.split(' ')[1];
    let isAdmin = false;
    try {
      const decoded = this.jwtService.verify(token);
      const requester = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { isAdmin: true },
      });
      isAdmin = requester?.isAdmin ?? false;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (!isAdmin) {
      throw new UnauthorizedException('Admin access required');
    }
    const count = await this.prisma.user.count();
    return { status: 'Database connected!', userCount: count };
  }

  @Get('users/me')
  async getMe(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid auth token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      let user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          email: true,
          name: true,
          universityId: true,
          isFocusing: true,
          focusStartedAt: true,
          lmsToken: true,
          lmsBaseUrl: true,
          createdAt: true,
          fouzarId: true,
          avatarUrl: true,
        }
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Backfill connection ID if null
      if (!user.fouzarId) {
        const generatedId = await this.prisma.$transaction(async (tx) => {
          let attempts = 0;
          while (attempts < 10) {
            const candidate = Math.floor(100000 + Math.random() * 900000).toString();
            const existing = await tx.user.findUnique({
              where: { fouzarId: candidate },
            });
            if (!existing) {
              return candidate;
            }
            attempts++;
          }
          throw new Error('Failed to generate a unique connection ID');
        });

        const updatedUser = await this.prisma.user.update({
          where: { id: user.id },
          data: { fouzarId: generatedId },
          select: {
            id: true,
            email: true,
            name: true,
            universityId: true,
            isFocusing: true,
            focusStartedAt: true,
            lmsToken: true,
            lmsBaseUrl: true,
            createdAt: true,
            fouzarId: true,
            avatarUrl: true,
          }
        });
        user = updatedUser;
      }
      
      // Decrypt token before returning if it exists
      if (user.lmsToken) {
        try {
          user.lmsToken = decrypt(user.lmsToken);
        } catch (decError) {
          console.warn('LMS token decryption failed, returning empty', decError);
          user.lmsToken = '';
        }
      }
      
      return user;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('sanctuary')
  async getPersonalSanctuary(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub as string;
      const personalId = `personal-${userId}`;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const sanctuary = await this.prisma.group.upsert({
        where: { id: personalId },
        update: {},
        create: {
          id: personalId,
          name: `${user.name ?? 'My'}'s Sanctuary`,
          creatorId: userId,
          currentSlide: '1',
        },
      });

      await this.prisma.membership.upsert({
        where: {
          groupId_userId: { groupId: personalId, userId },
        },
        update: { role: 'LEADER' },
        create: {
          groupId: personalId,
          userId,
          role: 'LEADER',
        },
      });

      return {
        ...sanctuary,
        isPersonal: true,
        roomPath: `/sanctuary`,
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Get('groups')
  async getGroups(@Headers('authorization') authHeader?: string) {
    return this.getGroupsMy(authHeader);
  }

  @Get('groups/my')
  async getGroupsMy(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      // Ensure default groups exist in database
      let groupsCount = await this.prisma.group.count();
      if (groupsCount === 0) {
        let creator = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!creator) {
          creator = await this.prisma.user.findFirst();
        }
        if (!creator) {
          const uni = await this.prisma.university.upsert({
            where: { name: 'MIT' },
            update: {},
            create: { name: 'MIT' },
          });
          creator = await this.prisma.user.create({
            data: {
              email: 'alex@mit.edu',
              name: 'Alex Mercer',
              universityId: uni.id,
            }
          });
        }
        await this.prisma.group.create({
          data: {
            id: 'group-1',
            name: 'CS-229 Neural Network Room',
            creatorId: creator.id,
            currentSlide: '1',
          }
        });
        await this.prisma.group.create({
          data: {
            id: 'group-2',
            name: 'CS-109 Study Desk',
            creatorId: creator.id,
            currentSlide: '1',
          }
        });
      }

      // Find user memberships (exclude private sanctuary from group list)
      const memberships = await this.prisma.membership.findMany({
        where: { userId },
        include: { group: true }
      });

      const sharedGroups = memberships
        .map((m) => m.group)
        .filter((g) => !g.id.startsWith('personal-'));

      return sharedGroups;
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post('users/focus')
  async updateFocusStatePost(
    @Headers('authorization') authHeader: string,
    @Body() body: { isFocusing: boolean }
  ) {
    return this.updateFocusState(authHeader, body);
  }

  @Patch('users/me/focus')
  async updateFocusState(
    @Headers('authorization') authHeader: string,
    @Body() body: { isFocusing: boolean }
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.update({
        where: { id: decoded.sub },
        data: {
          isFocusing: body.isFocusing,
          focusStartedAt: body.isFocusing ? new Date() : null
        }
      });
      return { success: true, isFocusing: user.isFocusing };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Patch('users/me')
  async updateProfile(
    @Headers('authorization') authHeader: string,
    @Body() body: { name?: string; email?: string; preferredAiModel?: string; avatarUrl?: string }
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.preferredAiModel !== undefined) updateData.preferredAiModel = body.preferredAiModel;
      if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;

      const user = await this.prisma.user.update({
        where: { id: decoded.sub },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          universityId: true,
          preferredAiModel: true,
          createdAt: true,
          fouzarId: true,
          avatarUrl: true,
        }
      });
      return { success: true, user };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post('users/me/bypass')
  async setBypassState(
    @Headers('authorization') authHeader: string,
    @Body() body: { isBypassed: boolean; durationMinutes?: number }
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;
      this.appService.setBypass(userId, body.isBypassed, body.durationMinutes || 5);
      return { success: true, isBypassed: body.isBypassed };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Patch('lms/token')
  async patchLmsToken(
    @Headers('authorization') authHeader: string,
    @Body() body: { token: string; baseUrl: string; lmsProvider?: string }
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const provider = body.lmsProvider === 'canvas' ? 'canvas' : 'moodle';
      const encryptedToken = encrypt(body.token);
      const test = await this.lmsService.getDeadlinesForProvider(provider, body.baseUrl, body.token);
      if (test.error) {
        return { success: false, message: test.error };
      }
      await this.prisma.user.update({
        where: { id: decoded.sub },
        data: {
          lmsToken: encryptedToken,
          lmsBaseUrl: body.baseUrl,
          lmsProvider: provider,
        }
      });
      return {
        success: true,
        message: `${provider === 'canvas' ? 'Canvas' : 'Moodle'} connected successfully`,
        provider,
        deadlineCount: test.deadlines.length,
      };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post('lms/connect')
  async connectLms(
    @Headers('authorization') authHeader: string,
    @Body() body: { lmsType: string; url: string; token: string }
  ) {
    return this.patchLmsToken(authHeader, {
      token: body.token,
      baseUrl: body.url,
      lmsProvider: body.lmsType,
    });
  }

  @Get('lms/status')
  async getLmsStatus(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.verify(token);
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { lmsToken: true, lmsBaseUrl: true, lmsProvider: true },
    });
    return {
      connected: !!(user?.lmsToken && user?.lmsBaseUrl),
      provider: user?.lmsProvider ?? null,
      baseUrl: user?.lmsBaseUrl ?? null,
    };
  }

  @Get('lms/deadlines')
  async getDeadlines(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];

    const demoDeadlines = [
      { id: 'dl-1', course: 'DEMO', title: 'Connect LMS to see real deadlines', timeLeftHours: 14, timeLeftLabel: '14 hours left' },
      { id: 'dl-2', course: 'DEMO', title: 'Example Assignment', timeLeftHours: 36, timeLeftLabel: '36 hours left' },
      { id: 'dl-3', course: 'DEMO', title: 'Example Quiz', timeLeftHours: 72, timeLeftLabel: '3 days remaining' },
    ];

    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          lmsToken: true,
          lmsBaseUrl: true,
          lmsProvider: true,
        }
      });

      if (user?.lmsToken && user?.lmsBaseUrl) {
        const decryptedToken = decrypt(user.lmsToken);
        const provider = user.lmsProvider ?? 'moodle';
        const result = await this.lmsService.getDeadlinesForProvider(
          provider,
          user.lmsBaseUrl,
          decryptedToken,
        );

        if (result.error) {
          return {
            source: 'error',
            connected: true,
            provider,
            error: result.error,
            deadlines: [],
          };
        }

        return {
          source: 'live',
          connected: true,
          provider,
          deadlines: result.deadlines,
        };
      }

      return {
        source: 'demo',
        connected: false,
        provider: null,
        message: 'Connect Moodle or Canvas in LMS Bridge to see real deadlines.',
        deadlines: demoDeadlines,
      };
    } catch (e) {
      console.warn('LMS deadlines fetch failed:', e);
      return {
        source: 'demo',
        connected: false,
        provider: null,
        deadlines: demoDeadlines,
      };
    }
  }

  @Get('uploads/:filename')
  async getUploadedFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('File not found');
      return;
    }
    
    // Guess MIME type or set general application/octet-stream
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.txt' || ext === '.md') contentType = 'text/plain';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  }

  @Get('lms/courses/contents')
  async getCourseContents(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { lmsToken: true, lmsBaseUrl: true, lmsProvider: true },
      });
      if (!user?.lmsToken || !user?.lmsBaseUrl) {
        return { source: 'not-connected', courses: [] };
      }
      const decryptedToken = decrypt(user.lmsToken);
      // Only Moodle supports core_course_get_contents
      if (user.lmsProvider === 'canvas') {
        return { source: 'unsupported', courses: [] };
      }
      const courses = await this.lmsService.getAllCourseContents(user.lmsBaseUrl, decryptedToken);
      return { source: 'live', courses };
    } catch (e) {
      console.warn('Course contents fetch failed:', e);
      return { source: 'error', courses: [] };
    }
  }

  @Get('lms/grades')
  async getGrades(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { lmsToken: true, lmsBaseUrl: true, lmsProvider: true },
      });
      if (!user?.lmsToken || !user?.lmsBaseUrl) {
        return { source: 'not-connected', grades: [] };
      }
      const decryptedToken = decrypt(user.lmsToken);
      if (user.lmsProvider === 'canvas') {
        return { source: 'unsupported', grades: [] };
      }
      const grades = await this.lmsService.getMoodleGrades(user.lmsBaseUrl, decryptedToken);
      return { source: 'live', grades };
    } catch (e) {
      console.warn('Grades fetch failed:', e);
      return { source: 'error', grades: [] };
    }
  }

  @Get('lms/assignments')
  async getAssignments(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { lmsToken: true, lmsBaseUrl: true, lmsProvider: true },
      });
      if (!user?.lmsToken || !user?.lmsBaseUrl) return { source: 'not-connected', assignments: [] };
      if (user.lmsProvider === 'canvas') return { source: 'unsupported', assignments: [] };
      const decryptedToken = decrypt(user.lmsToken);
      const assignments = await this.lmsService.getMoodleAssignmentsWithStatus(user.lmsBaseUrl, decryptedToken);
      return { source: 'live', assignments };
    } catch (e) {
      console.warn('Assignments fetch failed:', e);
      return { source: 'error', assignments: [] };
    }
  }

  @Get('lms/quizzes')
  async getQuizzes(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { lmsToken: true, lmsBaseUrl: true, lmsProvider: true },
      });
      if (!user?.lmsToken || !user?.lmsBaseUrl) return { source: 'not-connected', quizzes: [] };
      if (user.lmsProvider === 'canvas') return { source: 'unsupported', quizzes: [] };
      const decryptedToken = decrypt(user.lmsToken);
      const quizzes = await this.lmsService.getMoodleQuizzes(user.lmsBaseUrl, decryptedToken);
      return { source: 'live', quizzes };
    } catch (e) {
      console.warn('Quizzes fetch failed:', e);
      return { source: 'error', quizzes: [] };
    }
  }

  @Get('lms/forums')
  async getForums(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { lmsToken: true, lmsBaseUrl: true, lmsProvider: true },
      });
      if (!user?.lmsToken || !user?.lmsBaseUrl) return { source: 'not-connected', forums: [] };
      if (user.lmsProvider === 'canvas') return { source: 'unsupported', forums: [] };
      const decryptedToken = decrypt(user.lmsToken);
      const forums = await this.lmsService.getMoodleForumActivity(user.lmsBaseUrl, decryptedToken);
      return { source: 'live', forums };
    } catch (e) {
      console.warn('Forums fetch failed:', e);
      return { source: 'error', forums: [] };
    }
  }

  @Get('lms/courses')
  async getCourses(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { lmsToken: true, lmsBaseUrl: true, lmsProvider: true },
      });
      if (!user?.lmsToken || !user?.lmsBaseUrl) return { source: 'not-connected', courses: [] };
      if (user.lmsProvider === 'canvas') return { source: 'unsupported', courses: [] };
      const decryptedToken = decrypt(user.lmsToken);
      const courses = await this.lmsService.getMoodleCoursesDetailed(user.lmsBaseUrl, decryptedToken);
      return { source: 'live', courses };
    } catch (e) {
      console.warn('Courses fetch failed:', e);
      return { source: 'error', courses: [] };
    }
  }

  @Get('portal/status')
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

  @Patch('portal/connect')
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

  @Get('portal/profile')
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

  @Post('portal/attendance')
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

  @Post('portal/transcript')
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

  @Patch('portal/gpa')
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
