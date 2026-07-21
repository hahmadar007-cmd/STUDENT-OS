import { Controller, Get, Post, Patch, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LmsService } from './lms.service';
import { encrypt, decrypt } from '../utils/crypto';

@Controller('lms')
export class LmsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly lmsService: LmsService,
  ) {}

  @Patch('token')
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

  @Post('connect')
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

  @Post('login')
  async loginLms(
    @Headers('authorization') authHeader: string,
    @Body() body: { lmsType: string; url: string; username?: string; password?: string }
  ) {
    if (body.lmsType !== 'moodle') {
      return { success: false, message: 'Login only supported for Moodle' };
    }
    if (!body.username || !body.password) {
      return { success: false, message: 'Username and password required' };
    }

    try {
      const token = await this.lmsService.loginMoodle(body.url, body.username, body.password);
      // Once we have the token, we can just pipe it into the existing connect flow
      return this.patchLmsToken(authHeader, {
        token,
        baseUrl: body.url,
        lmsProvider: body.lmsType,
      });
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to login' };
    }
  }

  @Get('status')
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
      provider: user?.lmsProvider || 'moodle',
    };
  }

  @Get('profile')
  async getLmsProfile(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    const decoded = this.jwtService.verify(token);
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { lmsToken: true, lmsBaseUrl: true, lmsProvider: true },
    });

    if (!user?.lmsToken || !user?.lmsBaseUrl) {
      return { connected: false };
    }

    try {
      const decryptedToken = decrypt(user.lmsToken);
      let fullName = 'Unknown User';
      let studentId = '';
      let universityName = new URL(user.lmsBaseUrl).hostname;

      if (user.lmsProvider === 'moodle') {
        const root = this.lmsService.normalizeBaseUrl(user.lmsBaseUrl);
        const infoUrl = `${root}/webservice/rest/server.php?wstoken=${decryptedToken}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`;
        const res = await fetch(infoUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.fullname) fullName = data.fullname;
          if (data.username) studentId = data.username;
          if (data.sitename) universityName = data.sitename;
        }
      } else if (user.lmsProvider === 'canvas') {
        const root = this.lmsService.normalizeBaseUrl(user.lmsBaseUrl);
        const res = await fetch(`${root}/api/v1/users/self`, {
          headers: { Authorization: `Bearer ${decryptedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.name) fullName = data.name;
          if (data.login_id) studentId = data.login_id;
        }
      }

      return {
        connected: true,
        universityName,
        platform: user.lmsProvider === 'canvas' ? 'Canvas' : 'Moodle',
        fullName,
        studentId,
        status: 'Online',
        lastSync: new Date().toISOString(),
      };
    } catch (e) {
      return { connected: false, error: 'Failed to fetch profile' };
    }
  }

  @Post('disconnect')
  async disconnectLms(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];

    const decoded = this.jwtService.verify(token);
    await this.prisma.user.update({
      where: { id: decoded.sub },
      data: {
        lmsToken: null,
        lmsBaseUrl: null,
        lmsProvider: null,
      }
    });
    return { success: true };
  }

  @Get('deadlines')
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

  @Get('courses/contents')
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

  @Get('grades')
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

  @Get('assignments')
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

  @Get('quizzes')
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

  @Get('forums')
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

  @Get('courses')
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
}
