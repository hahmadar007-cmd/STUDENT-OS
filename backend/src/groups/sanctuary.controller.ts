import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Controller('sanctuary')
export class SanctuaryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
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
}
