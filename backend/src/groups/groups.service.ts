import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMessages(groupId: string) {
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

  async addGroupMember(groupId: string, connectionId: string, currentUserId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new Error('Group not found');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { fouzarId: connectionId },
    });
    if (!targetUser) {
      throw new Error('User with this Connection ID not found');
    }

    return this.prisma.membership.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUser.id,
        },
      },
      update: {},
      create: {
        groupId,
        userId: targetUser.id,
        role: 'MEMBER',
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

    if (group.creatorId !== userId) {
      const membership = await this.prisma.membership.findFirst({
        where: { groupId, userId, role: 'LEADER' },
      });
      if (!membership) {
        throw new Error('Unauthorized: Only the creator or a leader can delete this circle');
      }
    }

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
      const membership = await this.prisma.membership.findFirst({
        where: { groupId, userId, role: 'LEADER' },
      });
      if (!membership) {
        throw new Error('Unauthorized: Only the creator or a leader can rename this circle');
      }
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: { name },
    });
  }
}
