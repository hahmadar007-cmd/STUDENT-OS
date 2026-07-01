import { Controller, Get, Post, Patch, Body, Headers, UnauthorizedException } from '@nestjs/common';
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
