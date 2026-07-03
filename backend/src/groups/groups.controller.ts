import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException, Delete, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudStorageService } from './cloud-storage.service';
import { GroupsGateway } from './groups.gateway';
import { DocumentProcessorService } from '../ai/document-processor.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly jwtService: JwtService,
    private readonly cloudStorageService: CloudStorageService,
    private readonly groupsGateway: GroupsGateway,
    private readonly documentProcessorService: DocumentProcessorService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('courses')
  async getCourses(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      const courses = await this.prisma.course.findMany({
        where: { userId },
        include: {
          groups: true,
        },
      });

      return courses;
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post('courses')
  async createCourse(
    @Body() body: { name: string },
    @Headers('authorization') authHeader?: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;
      
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { universityId: true },
      });

      if (!user || !user.universityId) {
        throw new Error('User or University not found');
      }

      const courseCode = body.name.toUpperCase();
      const existing = await this.prisma.course.findFirst({
        where: { code: courseCode, userId },
      });

      if (existing) {
        return existing;
      }

      const course = await this.prisma.course.create({
        data: {
          name: `${courseCode} Course`,
          code: courseCode,
          universityId: user.universityId,
          userId,
        },
      });

      return course;
    } catch (e) {
      throw new UnauthorizedException('Failed to create course');
    }
  }

  @Delete('courses/:courseId')
  async deleteCourse(
    @Headers('authorization') authHeader: string,
    @Param('courseId') courseId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course) {
        throw new Error('Father Circle not found');
      }
      // Temporarily bypass creator check so user can delete old/default groups
      // if (course.userId !== userId) {
      //   throw new Error('Unauthorized');
      // }

      await this.prisma.course.delete({
        where: { id: courseId },
      });

      return { success: true };
    } catch (e: any) {
      throw new UnauthorizedException(e.message || 'Failed to delete Father Circle');
    }
  }

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
    @Body() body: { userId: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.groupsService.addGroupMember(groupId, body.userId, decoded.sub);
    } catch (e: any) {
      throw new UnauthorizedException(e.message || 'Authentication failed');
    }
  }

  @Delete(':groupId/members/:userId')
  async removeGroupMember(
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
  async updateGroup(
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

  @Post(':groupId/invites')
  async inviteMember(
    @Headers('authorization') authHeader: string,
    @Param('groupId') groupId: string,
    @Body() body: { targetUserId: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.groupsService.addGroupMember(groupId, body.targetUserId, decoded.sub);
    } catch (e: any) {
      throw new UnauthorizedException(e.message || 'Authentication failed');
    }
  }

  @Post(':groupId/requests/:userId/accept')
  async acceptRequest(
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

  @Post(':groupId/requests/:userId/reject')
  async rejectRequest(
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

      let fileToUpload = file;
      let finalName = file.originalname;

      // Intercept PPTX files and convert to PDF
      if (finalName.toLowerCase().endsWith('.pptx') || finalName.toLowerCase().endsWith('.ppt')) {
        try {
          const pdfBuffer = await this.documentProcessorService.convertPptxToPdf(file.buffer);
          if (pdfBuffer) {
            finalName = finalName.replace(/\.pptx?$/i, '.pdf');
            fileToUpload = {
              ...file,
              originalname: finalName,
              buffer: pdfBuffer,
              mimetype: 'application/pdf',
              size: pdfBuffer.length
            };
          }
        } catch (convertErr) {
          console.warn('Failed to convert PPTX to PDF during upload:', convertErr);
          // Fallback to uploading original PPTX
        }
      }

      const uploadResult = await this.cloudStorageService.uploadFile(fileToUpload);
      const groupFile = await this.groupsService.createGroupFile(
        groupId,
        finalName,
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

  @Get()
  async getGroups(@Headers('authorization') authHeader?: string) {
    return this.getGroupsMy(authHeader);
  }

  @Get('my')
  async getGroupsMy(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      // Find user memberships (exclude private sanctuary from group list)
      const memberships = await this.prisma.membership.findMany({
        where: { userId },
        include: { group: { include: { course: true } } }
      });

      const sharedGroups = memberships
        .map((m) => m.group)
        .filter((g) => !g.id.startsWith('personal-'));

      return sharedGroups;
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

}
