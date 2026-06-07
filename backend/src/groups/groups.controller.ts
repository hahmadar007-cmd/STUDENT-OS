import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtService } from '@nestjs/jwt';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  async createGroup(
    @Headers('authorization') authHeader: string,
    @Body() body: { name: string; courseCode?: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.groupsService.createGroup(body.name, decoded.sub, body.courseCode);
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Get(':groupId/messages')
  getMessages(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
    return this.groupsService.getMessages(groupId);
  }

  @Post(':groupId/members')
  async addGroupMember(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
    @Body() body: { connectionId: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.groupsService.addGroupMember(groupId, body.connectionId, decoded.sub);
    } catch (e) {
      throw e;
    }
  }
}
