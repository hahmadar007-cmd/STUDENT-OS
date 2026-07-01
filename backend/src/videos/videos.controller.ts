import { Controller, Get, Post, Body, Headers, UnauthorizedException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Controller('videos')
export class VideosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
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

  @Get(':folderId')
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
}
