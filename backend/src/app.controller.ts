import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Videos routes moved to VideosController

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

  // User routes moved to UsersController

  // LMS routes moved to LmsController


  // Portal routes moved to PortalController
}
