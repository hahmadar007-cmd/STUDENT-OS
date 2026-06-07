import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class GroupsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GroupsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (client: ${client.id})`);
        client.disconnect(true);
        return;
      }
      const decoded = this.jwtService.verify(token);
      if (!decoded || !decoded.sub) {
        this.logger.warn(`Connection rejected: Invalid token (client: ${client.id})`);
        client.disconnect(true);
        return;
      }
      // Join user specific room for targeted signals
      await client.join(`user:${decoded.sub}`);
      this.logger.log(`Client authenticated: ${decoded.sub} (socket: ${client.id})`);
    } catch (e: any) {
      this.logger.warn(`Connection rejected: Auth error (client: ${client.id}): ${e.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    client.join(data.groupId);
    this.logger.log(`Client ${client.id} joined group: ${data.groupId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; content: string; slideId: string | null },
  ) {
    let senderId = '';

    try {
      const token = client.handshake.auth?.token;
      if (token) {
        const decoded = this.jwtService.verify(token);
        senderId = decoded.sub;
      }
    } catch (e) {
      this.logger.warn('JWT verify failed on sendMessage, attempting fallback', e);
    }

    if (!senderId) {
      const user = await this.prisma.user.findFirst();
      if (user) {
        senderId = user.id;
      } else {
        const uni = await this.prisma.university.upsert({
          where: { name: 'MIT' },
          update: {},
          create: { name: 'MIT' },
        });
        const newUser = await this.prisma.user.create({
          data: {
            email: 'alex@mit.edu',
            name: 'Alex Mercer',
            universityId: uni.id,
          },
        });
        senderId = newUser.id;
      }
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        groupId: data.groupId,
        senderId,
        content: data.content,
        slideId: data.slideId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.server.to(data.groupId).emit('onMessage', message);
  }

  @SubscribeMessage('syncSlide')
  async handleSyncSlide(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; slideId: string },
  ) {
    try {
      let creatorId = '';
      const creator = await this.prisma.user.findFirst();
      if (creator) {
        creatorId = creator.id;
      } else {
        const uni = await this.prisma.university.upsert({
          where: { name: 'MIT' },
          update: {},
          create: { name: 'MIT' },
        });
        const user = await this.prisma.user.create({
          data: {
            email: 'alex@mit.edu',
            name: 'Alex Mercer',
            universityId: uni.id,
          },
        });
        creatorId = user.id;
      }

      await this.prisma.group.upsert({
        where: { id: data.groupId },
        update: { currentSlide: data.slideId },
        create: {
          id: data.groupId,
          name: data.groupId === 'group-1' ? 'CS-229 Neural Network Room' : 'CS-109 Study Desk',
          currentSlide: data.slideId,
          creatorId,
        },
      });
    } catch (e) {
      this.logger.error('Failed to sync slide in DB', e);
    }

    this.server.to(data.groupId).emit('slideUpdated', { slideId: data.slideId });
  }

  @SubscribeMessage('updateFocusState')
  async handleUpdateFocusState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { isFocusing: boolean },
  ) {
    let userId = '';
    let userName = 'Guest';

    try {
      const token = client.handshake.auth?.token;
      if (token) {
        const decoded = this.jwtService.verify(token);
        userId = decoded.sub;
      }
    } catch (e) {
      this.logger.warn('JWT verify failed on updateFocusState', e);
    }

    if (!userId) {
      const user = await this.prisma.user.findFirst();
      if (user) {
        userId = user.id;
        userName = user.name || 'Alex Mercer';
      }
    } else {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        userName = user.name || 'Alex Mercer';
      }
    }

    if (userId) {
      const focusStartedAt = data.isFocusing ? new Date() : null;
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isFocusing: data.isFocusing,
          focusStartedAt,
        },
      });

      this.server.emit('friendFocusStateChanged', {
        userId,
        name: userName,
        isFocusing: data.isFocusing,
        focusStartedAt: focusStartedAt ? focusStartedAt.toISOString() : null,
      });
    }
  }

  @SubscribeMessage('sendSignal')
  async handleSendSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string },
  ) {
    let senderId = '';
    let senderName = 'A peer';
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (token) {
        const decoded = this.jwtService.verify(token);
        senderId = decoded.sub;
        const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
        if (sender) {
          senderName = sender.name || 'A peer';
        }
      }
    } catch (e: any) {
      this.logger.warn(`Failed to parse token in sendSignal: ${e.message}`);
    }

    if (senderId) {
      // Emit to the target user's personal room
      this.server.to(`user:${data.targetUserId}`).emit('signalReceived', {
        senderId,
        senderName,
        targetUserId: data.targetUserId,
      });
      this.logger.log(`Signal sent from ${senderName} (${senderId}) to ${data.targetUserId}`);
    } else {
      this.logger.warn(`Signal dropped: could not resolve sender identity for client ${client.id}`);
    }
  }
}
