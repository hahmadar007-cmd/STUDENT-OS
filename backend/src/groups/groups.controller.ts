import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException, Delete, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudStorageService } from './cloud-storage.service';
import { GroupsGateway } from './groups.gateway';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly jwtService: JwtService,
    private readonly cloudStorageService: CloudStorageService,
    private readonly groupsGateway: GroupsGateway,
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
      const decoded = this.jwtService.verify(token);
      const requestingUser = await this.groupsService.getUserById(decoded.sub);
      if (requestingUser?.email !== 'h.ahmad.ar007@gmail.com') {
        return [];
      }
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

  @Post(':groupId/files')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGroupFile(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
    @UploadedFile() file: any,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      
      // Get user name for metadata attribution
      const user = await this.groupsService.getMembers(groupId).then(members => 
        members.find(m => m.userId === decoded.sub)?.user
      );
      const uploadedBy = user?.name || 'A circle scholar';

      const uploadResult = await this.cloudStorageService.uploadFile(file);
      const groupFile = await this.groupsService.createGroupFile(
        groupId,
        file.originalname,
        uploadResult.url,
        uploadResult.sizeLabel,
        uploadedBy,
      );

      // Broadcast file sync WebSocket signal
      if (this.groupsGateway.server) {
        this.groupsGateway.server.to(groupId).emit('fileSync', {
          action: 'uploaded',
          groupId,
          file: groupFile,
        });
      }

      return { success: true, file: groupFile };
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Failed to upload file');
    }
  }

  @Get(':groupId/files')
  async getGroupFiles(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      this.jwtService.verify(token);
      return this.groupsService.getGroupFiles(groupId);
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Authentication failed');
    }
  }

  @Delete(':groupId/files/:fileId')
  async deleteGroupFile(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
    @Param('fileId') fileId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      this.jwtService.verify(token);
      const deletedFile = await this.groupsService.deleteGroupFile(groupId, fileId);
      
      // Delete local backup if it was saved locally
      await this.cloudStorageService.deleteFile(deletedFile.fileUrl);

      // Broadcast delete sync WebSocket signal
      if (this.groupsGateway.server) {
        this.groupsGateway.server.to(groupId).emit('fileSync', {
          action: 'deleted',
          groupId,
          fileId,
        });
      }

      return { success: true, message: 'File deleted successfully' };
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Authentication failed');
    }
  }
}
