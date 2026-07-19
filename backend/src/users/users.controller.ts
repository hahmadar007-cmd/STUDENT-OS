import { Controller, Get, Post, Patch, Body, Headers, UnauthorizedException, BadRequestException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppService } from '../app.service';
import { decrypt } from '../utils/crypto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly appService: AppService,
  ) {}

  @Get('me')
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
          username: true,
          department: true,
          bio: true,
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
            username: true,
            department: true,
            bio: true,
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
    } catch (e: any) {
      console.error('getMe Error:', e);
      if (e instanceof UnauthorizedException) throw e;
      if (e.name === 'TokenExpiredError' || e.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid or expired token');
      }
      throw new Error('Failed to fetch user profile');
    }
  }

  @Post('focus')
  async updateFocusStatePost(
    @Headers('authorization') authHeader: string,
    @Body() body: { isFocusing: boolean }
  ) {
    return this.updateFocusState(authHeader, body);
  }

  @Patch('me/focus')
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

  @Patch('me')
  async updateProfile(
    @Headers('authorization') authHeader: string,
    @Body() body: { name?: string; email?: string; preferredAiModel?: string; avatarUrl?: string; username?: string; department?: string; bio?: string; }
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
      if (body.department !== undefined) updateData.department = body.department;
      if (body.bio !== undefined) updateData.bio = body.bio;

      if (body.username !== undefined) {
        let rawUsername = body.username;
        if (rawUsername) {
          rawUsername = rawUsername.toLowerCase().trim();
          
          if (rawUsername.length < 3 || rawUsername.length > 20) {
            throw new BadRequestException('Username must be between 3 and 20 characters');
          }
          if (!/^[a-z0-9_]+$/.test(rawUsername)) {
            throw new BadRequestException('Username can only contain letters, numbers, and underscores');
          }
          if (rawUsername.startsWith('_') || rawUsername.endsWith('_')) {
            throw new BadRequestException('Username cannot start or end with an underscore');
          }
          if (rawUsername.includes('__')) {
            throw new BadRequestException('Username cannot contain consecutive underscores');
          }
          if (/^\d+$/.test(rawUsername)) {
            throw new BadRequestException('Username cannot be only numbers');
          }
          
          const reservedWords = [
            'admin', 'administrator', 'system', 'support', 'help', 'security', 'root', 'owner',
            'null', 'undefined', 'me', 'settings', 'login', 'register', 'dashboard', 'api',
            'fasca', 'fouzar', 'profile', 'auth', 'signup', 'signin', 'password', 'account',
            'moderator', 'mod', 'official', 'staff', 'team', 'bot', 'notification', 'status'
          ];
          if (reservedWords.includes(rawUsername)) {
            throw new BadRequestException('This username is reserved');
          }

          const existingUser = await this.prisma.user.findFirst({
            where: { username: rawUsername, id: { not: decoded.sub } },
          });
          if (existingUser) {
            throw new BadRequestException('Username is already taken');
          }
        }
        updateData.username = rawUsername || null; // allow nulling out? Or just store empty string/null. Usually users can't remove it once set, but let's allow setting it.
      }

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
          username: true,
          department: true,
          bio: true,
        }
      });
      return { success: true, user };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Get('check-username/:username')
  async checkUsername(@Param('username') rawUsername: string, @Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    let userId: string;
    try {
      const decoded = this.jwtService.verify(token);
      userId = decoded.sub;
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }

    if (!rawUsername) {
       return { available: false, username: '' };
    }

    const username = rawUsername.toLowerCase().trim();
    
    // Quick validation checks so we don't say invalid strings are "available"
    if (username.length < 3 || username.length > 20 || !/^[a-z0-9_]+$/.test(username) || username.startsWith('_') || username.endsWith('_') || username.includes('__') || /^\d+$/.test(username)) {
      return { available: false, username };
    }

    const reservedWords = [
      'admin', 'administrator', 'system', 'support', 'help', 'security', 'root', 'owner',
      'null', 'undefined', 'me', 'settings', 'login', 'register', 'dashboard', 'api',
      'fasca', 'fouzar', 'profile', 'auth', 'signup', 'signin', 'password', 'account',
      'moderator', 'mod', 'official', 'staff', 'team', 'bot', 'notification', 'status'
    ];
    if (reservedWords.includes(username)) {
      return { available: false, username };
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { username, id: { not: userId } },
    });

    return { available: !existingUser, username };
  }

  @Post('me/bypass')
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
}
