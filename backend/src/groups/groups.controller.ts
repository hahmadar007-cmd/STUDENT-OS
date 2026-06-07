import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException, Delete, Patch } from '@nestjs/common';
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
  getMessages(@Param('groupId') groupId: string) {
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

  @Delete(':groupId')
  async deleteGroup(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.groupsService.deleteGroup(groupId, decoded.sub);
    } catch (e: any) {
      throw new UnauthorizedException(e.message || 'Authentication failed');
    }
  }

  @Patch(':groupId')
  async renameGroup(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
    @Body() body: { name: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.groupsService.renameGroup(groupId, body.name, decoded.sub);
    } catch (e: any) {
      throw new UnauthorizedException(e.message || 'Authentication failed');
    }
  }

  @Get(':groupId/members')
  async getMembers(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      this.jwtService.verify(token);
      return this.groupsService.getMembers(groupId);
    } catch (e: any) {
      throw new UnauthorizedException(e.message || 'Authentication failed');
    }
  }

  @Post(':groupId/members/:userId/accept')
  async acceptMembership(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.groupsService.acceptMembership(groupId, userId, decoded.sub);
    } catch (e: any) {
      throw new UnauthorizedException(e.message || 'Authentication failed');
    }
  }

  @Delete(':groupId/members/:userId/reject')
  async rejectMembership(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.groupsService.rejectMembership(groupId, userId, decoded.sub);
    } catch (e: any) {
      throw new UnauthorizedException(e.message || 'Authentication failed');
    }
  }
}
