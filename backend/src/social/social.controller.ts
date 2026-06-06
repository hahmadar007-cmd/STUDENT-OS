import { Controller, Get, Post, Delete, Body, Param, Headers, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Controller('social')
export class SocialController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private getUserId(authHeader?: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return decoded.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Get('friends')
  async getFriends(@Headers('authorization') authHeader?: string) {
    const userId = this.getUserId(authHeader);

    // Find all friendships that are ACCEPTED where the user is either the initiator or the receiver
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { userId: userId },
          { friendId: userId },
        ],
      },
      include: {
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
        friend: {
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

    // Map friendships to get the other person's info
    return friendships.map((f: any) => {
      const other = f.userId === userId ? f.friend : f.user;
      return {
        friendshipId: f.id,
        id: other.id,
        name: other.name ?? other.email.split('@')[0],
        email: other.email,
        fouzarId: other.fouzarId,
        avatarUrl: other.avatarUrl,
        isFocusing: other.isFocusing,
        focusStartedAt: other.focusStartedAt,
      };
    });
  }

  @Get('friends/requests')
  async getFriendRequests(@Headers('authorization') authHeader?: string) {
    const userId = this.getUserId(authHeader);

    const incoming = await this.prisma.friendship.findMany({
      where: {
        friendId: userId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            fouzarId: true,
            avatarUrl: true,
          },
        },
      },
    });

    const outgoing = await this.prisma.friendship.findMany({
      where: {
        userId: userId,
        status: 'PENDING',
      },
      include: {
        friend: {
          select: {
            id: true,
            name: true,
            email: true,
            fouzarId: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      incoming: incoming.map((req: any) => ({
        id: req.id,
        sender: {
          id: req.user.id,
          name: req.user.name ?? req.user.email.split('@')[0],
          email: req.user.email,
          fouzarId: req.user.fouzarId,
          avatarUrl: req.user.avatarUrl,
        },
        createdAt: req.createdAt,
      })),
      outgoing: outgoing.map((req: any) => ({
        id: req.id,
        receiver: {
          id: req.friend.id,
          name: req.friend.name ?? req.friend.email.split('@')[0],
          email: req.friend.email,
          fouzarId: req.friend.fouzarId,
          avatarUrl: req.friend.avatarUrl,
        },
        createdAt: req.createdAt,
      })),
    };
  }

  @Post('friends/request')
  async sendFriendRequest(
    @Headers('authorization') authHeader: string,
    @Body() body: { connectionId: string },
  ) {
    const userId = this.getUserId(authHeader);
    const targetConnectionId = body.connectionId?.trim();

    if (!targetConnectionId) {
      throw new BadRequestException('Connection ID is required');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (currentUser?.fouzarId === targetConnectionId) {
      throw new BadRequestException('You cannot add yourself as a friend');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { fouzarId: targetConnectionId },
    });

    if (!targetUser) {
      throw new NotFoundException('User with this Connection ID not found');
    }

    // Check if relation already exists
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: userId, friendId: targetUser.id },
          { userId: targetUser.id, friendId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new BadRequestException('You are already friends with this user');
      } else if (existing.userId === userId) {
        throw new BadRequestException('You have already sent a friend request to this user');
      } else {
        throw new BadRequestException('This user has already sent you a friend request. Accept it from pending requests.');
      }
    }

    const request = await this.prisma.friendship.create({
      data: {
        userId: userId,
        friendId: targetUser.id,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Friend request sent successfully',
      id: request.id,
    };
  }

  @Post('friends/accept')
  async acceptFriendRequest(
    @Headers('authorization') authHeader: string,
    @Body() body: { requestId: string },
  ) {
    const userId = this.getUserId(authHeader);

    const friendship = await this.prisma.friendship.findUnique({
      where: { id: body.requestId },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.friendId !== userId) {
      throw new UnauthorizedException('You can only accept requests sent to you');
    }

    await this.prisma.friendship.update({
      where: { id: body.requestId },
      data: { status: 'ACCEPTED' },
    });

    return {
      success: true,
      message: 'Friend request accepted',
    };
  }

  @Post('friends/reject')
  async rejectFriendRequest(
    @Headers('authorization') authHeader: string,
    @Body() body: { requestId: string },
  ) {
    const userId = this.getUserId(authHeader);

    const friendship = await this.prisma.friendship.findUnique({
      where: { id: body.requestId },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.friendId !== userId && friendship.userId !== userId) {
      throw new UnauthorizedException('You are not authorized to reject this request');
    }

    await this.prisma.friendship.delete({
      where: { id: body.requestId },
    });

    return {
      success: true,
      message: 'Friend request cancelled or declined',
    };
  }

  @Delete('friends/:friendId')
  async removeFriend(
    @Headers('authorization') authHeader: string,
    @Param('friendId') friendId: string,
  ) {
    const userId = this.getUserId(authHeader);

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { userId: userId, friendId: friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return {
      success: true,
      message: 'Friend removed successfully',
    };
  }
}
