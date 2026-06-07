import { Controller, Get, Post, Body, Param, Headers } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtService } from '@nestjs/jwt';
import { extractUserId } from '../utils/extractUserId';

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
    const userId = extractUserId(this.jwtService, authHeader);
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
    const userId = extractUserId(this.jwtService, authHeader);
    return this.groupsService.addGroupMember(
      groupId,
      body.connectionId,
      userId,
    );
  }
}
