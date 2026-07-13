import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

/**
 * FocusGateway – Cross-device sync hub.
 *
 * Every device (browser tab, Chrome Extension, Android app) authenticates with
 * a JWT via the handshake `auth.token` field and is placed into a per-user
 * room named `user:<userId>`. Broadcasts from any service can then call
 * `broadcastToUser()` to reach every device of that user simultaneously.
 */
@WebSocketGateway({
  namespace: '/focus',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class FocusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId -> Set of socket ids (for diagnostics)
  private userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token) as { sub: string };
      const userId = payload.sub;

      // Store userId on socket for later use
      (client as any).userId = userId;

      // Join per-user room
      await client.join(`user:${userId}`);

      // Track sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      console.log(
        `[FocusGateway] ${client.id} connected → user:${userId} (${this.userSockets.get(userId)!.size} devices)`,
      );
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId: string | undefined = (client as any).userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    console.log(`[FocusGateway] ${client.id} disconnected`);
  }

  /**
   * Emit an event to ALL devices belonging to a specific user.
   */
  broadcastToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
