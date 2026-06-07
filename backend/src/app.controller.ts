import { Controller, Get, Post, Patch, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LmsService } from './lms/lms.service';
import { encrypt, decrypt } from './utils/crypto';

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

  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch {
      return { status: 'degraded', database: 'disconnected' };
    }
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

      if (sharedGroups.length > 0) {
        return sharedGroups;
      }

      // If user has no memberships, automatically enroll them in all existing groups
      const allGroups = await this.prisma.group.findMany();
      for (const group of allGroups) {
        await this.prisma.membership.upsert({
          where: {
            groupId_userId: {
              groupId: group.id,
              userId
            }
          },
          update: {},
          create: {
            groupId: group.id,
            userId,
            role: 'MEMBER'
          }
        });
      }

      return allGroups;
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
      { id: 'dl-1', course: 'CS-229', title: 'Neural Networks Lab 3', timeLeftHours: 14, timeLeftLabel: '14 hours left' },
      { id: 'dl-2', course: 'CS-109', title: 'Probability Problem Set 4', timeLeftHours: 36, timeLeftLabel: '36 hours left' },
      { id: 'dl-3', course: 'PHY-201', title: 'Quantum Wave Equation Writeup', timeLeftHours: 72, timeLeftLabel: '3 days remaining' },
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
}