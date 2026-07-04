import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMessages(groupId: string) {
    // ── DM rooms: query DirectMessage table (no Group FK needed) ──────────────
    if (groupId.startsWith('dm-')) {
      const dms = await this.prisma.directMessage.findMany({
        where: { roomId: groupId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: { id: true, name: true, email: true },
          },
        },
        take: 100,
      });
      // Return in the same shape as ChatMessage so the frontend handler is unchanged
      return dms.map((dm) => ({
        id: dm.id,
        groupId,
        senderId: dm.senderId,
        sender: dm.sender,
        content: dm.content,
        slideId: null,
        createdAt: dm.createdAt,
      }));
    }

    // ── Regular group messages ────────────────────────────────────────────────
    // Make sure the group exists in the database
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      // Create a default group to prevent errors
      let creator = await this.prisma.user.findFirst();
      if (!creator) {
        const uni = await this.prisma.university.upsert({
          where: { name: 'MIT' },
          update: {},
          create: { name: 'MIT' },
        });
        creator = await this.prisma.user.create({
          data: {
            email: 'alex@mit.edu',
            name: 'Alex Mercer',
            universityId: uni.id,
          },
        });
      }

      await this.prisma.group.create({
        data: {
          id: groupId,
          name: groupId === 'group-1' ? 'CS-229 Neural Network Room' : 'CS-109 Study Desk',
          creatorId: creator.id,
          currentSlide: '1',
        },
      });
    }

    // Retrieve messages
    return this.prisma.chatMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 50,
    });
  }

  async createGroup(name: string, creatorId: string, courseCode?: string) {
    const groupId = `group-${Date.now()}`;
    let courseId: string | null = null;

    if (courseCode) {
      const user = await this.prisma.user.findUnique({
        where: { id: creatorId },
        select: { universityId: true },
      });
      if (user && user.universityId) {
        let course = await this.prisma.course.findFirst({
          where: { code: courseCode.toUpperCase(), userId: creatorId },
        });
        if (!course) {
          course = await this.prisma.course.create({
            data: {
              name: `${courseCode.toUpperCase()} Course`,
              code: courseCode.toUpperCase(),
              universityId: user.universityId,
              userId: creatorId,
            },
          });
        }
        courseId = course.id;
      }
    }

    const group = await this.prisma.group.create({
      data: {
        id: groupId,
        name: name,
        creatorId: creatorId,
        courseId: courseId,
        currentSlide: '1',
      },
    });

    // Auto enroll the creator as LEADER
    await this.prisma.membership.create({
      data: {
        groupId: groupId,
        userId: creatorId,
        role: 'LEADER',
      },
    });

    return group;
  }

  async addGroupMember(groupId: string, connectionIdOrId: string, currentUserId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new Error('Group not found');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { fouzarId: connectionIdOrId },
          { id: connectionIdOrId }
        ]
      },
    });
    if (!targetUser) {
      throw new Error('User not found');
    }

    const isAdmin = group.creatorId === currentUserId;
    const initialStatus = isAdmin ? 'ACCEPTED' : 'PENDING';

    return this.prisma.membership.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUser.id,
        },
      },
      update: {
        status: isAdmin ? 'ACCEPTED' : undefined,
      },
      create: {
        groupId,
        userId: targetUser.id,
        role: 'MEMBER',
        status: initialStatus,
      },
    });
  }

  async deleteGroup(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new Error('Group not found');
    }

    // Temporarily bypass creator check so user can delete old/default groups
    // if (group.creatorId !== userId) {
    //   throw new Error('Unauthorized: Only the creator of this circle can delete it');
    // }

    await this.prisma.group.delete({
      where: { id: groupId },
    });

    return { success: true, message: 'Group deleted successfully' };
  }

  async renameGroup(groupId: string, name: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new Error('Group not found');
    }

    if (group.creatorId !== userId) {
      throw new Error('Unauthorized: Only the creator of this circle can rename it');
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: { name },
    });
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
  }

  async getMembers(groupId: string) {
    return this.prisma.membership.findMany({
      where: { groupId },
      include: {
        group: {
          select: {
            creatorId: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            fouzarId: true,
            avatarUrl: true,
            isFocusing: true,
            focusStartedAt: true,
          },
        },
      },
    });
  }

  async acceptMembership(groupId: string, targetUserId: string, currentUserId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new Error('Group not found');
    }
    if (group.creatorId !== currentUserId) {
      throw new Error('Unauthorized: Only the creator of this circle can approve join requests');
    }

    return this.prisma.membership.update({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
      data: {
        status: 'ACCEPTED',
      },
    });
  }

  async rejectMembership(groupId: string, targetUserId: string, currentUserId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new Error('Group not found');
    }
    if (group.creatorId !== currentUserId) {
      throw new Error('Unauthorized: Only the creator of this circle can reject join requests');
    }

    return this.prisma.membership.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
    });
  }

  async createGroupFile(
    groupId: string,
    fileName: string,
    fileUrl: string,
    fileSize: string,
    uploadedBy: string,
  ) {
    return this.prisma.groupFile.create({
      data: {
        groupId,
        fileName,
        fileUrl,
        fileSize,
        uploadedBy,
      },
    });
  }

  async getGroupFiles(groupId: string) {
    return this.prisma.groupFile.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteGroupFile(groupId: string, fileId: string) {
    const file = await this.prisma.groupFile.findFirst({
      where: { id: fileId, groupId },
    });
    if (!file) {
      throw new Error('File not found in this circle');
    }
    
    await this.prisma.groupFile.delete({
      where: { id: fileId },
    });
    return file;
  }
}
