import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class GroupsGateway implements OnGatewayConnection, OnGatewayDisconnect {
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
        console.log(`Connection rejected: No token provided (client: ${client.id})`);
        client.disconnect(true);
        return;
      }
      const decoded = this.jwtService.verify(token);
      if (!decoded || !decoded.sub) {
        console.log(`Connection rejected: Invalid token (client: ${client.id})`);
        client.disconnect(true);
        return;
      }
      // Join user specific room for targeted signals
      await client.join(`user:${decoded.sub}`);
      console.log(`Client authenticated: ${decoded.sub} (socket: ${client.id})`);
    } catch (e: any) {
      console.log(`Connection rejected: Auth error (client: ${client.id}):`, e.message);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    client.join(data.groupId);
    console.log(`Client ${client.id} joined group: ${data.groupId}`);
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
      console.warn('JWT verify failed on sendMessage, attempting fallback', e);
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

  @SubscribeMessage('group_notes_update')
  async handleGroupNotesUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; notes: string },
  ) {
    try {
      // Broadcast to everyone else in the room
      client.to(data.groupId).emit('onGroupNotesUpdate', {
        groupId: data.groupId,
        notes: data.notes,
      });

      // Persist to DB
      await this.prisma.group.update({
        where: { id: data.groupId },
        data: { sharedNotes: data.notes },
      });
    } catch (err) {
      console.error('Failed to save group notes:', err);
    }
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
      console.error('Failed to sync slide in DB', e);
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
      console.warn('JWT verify failed on updateFocusState');
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
      console.warn('Failed to parse token in sendSignal:', e.message);
    }

    if (senderId) {
      // Emit to the target user's personal room
      this.server.to(`user:${data.targetUserId}`).emit('signalReceived', {
        senderId,
        senderName,
        targetUserId: data.targetUserId,
      });
      console.log(`Signal sent from ${senderName} (${senderId}) to ${data.targetUserId}`);
    }
  }

  /**
   * FEATURE B — Live Presentation Engine
   * Broadcaster announces that they have started a live preview session.
   * Emits `onPresenterSessionStart` to all members in the room.
   * Does NOT force layout changes or block any peer's current workflow.
   */
  @SubscribeMessage('presenter-session-start')
  async handlePresenterSessionStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; fileId: string; fileName: string },
  ) {
    let presenterId = '';
    let presenterName = 'A scholar';

    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (token) {
        const decoded = this.jwtService.verify(token);
        presenterId = decoded.sub;
        const presenter = await this.prisma.user.findUnique({ where: { id: presenterId } });
        if (presenter) {
          presenterName = presenter.name || 'A scholar';
        }
      }
    } catch (e: any) {
      console.warn('Failed to parse token in presenter-session-start:', e.message);
    }

    if (!presenterId) {
      client.emit('error', { message: 'Authentication required to start a presentation.' });
      return;
    }

    console.log(`[LivePresent] ${presenterName} (${presenterId}) started live session in group ${data.groupId} for file ${data.fileId}`);

    // Broadcast presence signal to everyone in the room (excluding the presenter themselves)
    client.to(data.groupId).emit('onPresenterSessionStart', {
      presenterId,
      presenterName,
      groupId: data.groupId,
      fileId: data.fileId,
      fileName: data.fileName,
      startedAt: new Date().toISOString(),
    });
  }

  /**
   * FEATURE B — Slide Page Relay
   * Presenter sends the current page number; gateway relays strictly to the
   * room socket registry. Peers who opted-in via `isFollowingPresenter` will
   * consume this. Peers who ignored the session are unaffected.
   */
  @SubscribeMessage('sync-slide-page')
  async handleSyncSlidePage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string; fileId: string; pageNumber: number },
  ) {
    let presenterId = '';

    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (token) {
        const decoded = this.jwtService.verify(token);
        presenterId = decoded.sub;
      }
    } catch (e: any) {
      console.warn('Failed to parse token in sync-slide-page:', e.message);
    }

    if (!presenterId) return;

    // Persist current slide to DB (reuse existing group.currentSlide field)
    try {
      await this.prisma.group.update({
        where: { id: data.groupId },
        data: { currentSlide: String(data.pageNumber) },
      });
    } catch (e) {
      // Group may not exist in DB; non-fatal
    }

    // Relay page frame to all room members — frontend gate (isFollowingPresenter) controls who acts on it
    client.to(data.groupId).emit('onSyncSlidePage', {
      presenterId,
      fileId: data.fileId,
      pageNumber: data.pageNumber,
    });
  }

  /**
   * FEATURE B — Presenter Session End
   * Cleanly signals that a live session has concluded so followers can
   * detach their viewport tracking automatically.
   */
  @SubscribeMessage('presenter-session-end')
  async handlePresenterSessionEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    let presenterId = '';
    let presenterName = 'A scholar';

    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (token) {
        const decoded = this.jwtService.verify(token);
        presenterId = decoded.sub;
        const presenter = await this.prisma.user.findUnique({ where: { id: presenterId } });
        if (presenter) presenterName = presenter.name || 'A scholar';
      }
    } catch (e: any) {
      console.warn('Failed to parse token in presenter-session-end:', e.message);
    }

    if (!presenterId) return;

    client.to(data.groupId).emit('onPresenterSessionEnd', {
      presenterId,
      presenterName,
      groupId: data.groupId,
    });

    console.log(`[LivePresent] ${presenterName} ended live session in group ${data.groupId}`);
  }
}
