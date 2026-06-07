import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtService } from '@nestjs/jwt';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly jwtService: JwtService,
  ) {}

  private verifyToken(authHeader?: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return decoded.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Post()
  async createGroup(
    @Headers('authorization') authHeader: string,
    @Body() body: { name: string; courseCode?: string },
  ) {
    const userId = this.verifyToken(authHeader);
    return this.groupsService.createGroup(body.name, userId, body.courseCode);
  }

  @Get(':groupId/messages')
  getMessages(@Param('groupId') groupId: string) {
    return this.groupsService.getMessages(groupId);
  }

  @Post(':groupId/members')
  async addGroupMember(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
    @Body() body: { connectionId: string },
  ) {
    const userId = this.verifyToken(authHeader);
    try {
      return await this.groupsService.addGroupMember(groupId, body.connectionId, userId);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes('not found')) {
          throw new NotFoundException(e.message);
        }
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }
}
