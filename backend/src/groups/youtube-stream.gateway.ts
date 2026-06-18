import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class YoutubeStreamGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_group_stream')
  handleJoinGroupStream(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`group_stream_${groupId}`);
    return { event: 'joined_stream', data: groupId };
  }

  @SubscribeMessage('group_stream_broadcast')
  handleStreamBroadcast(
    @MessageBody() data: { groupId: string; videoId: string; action: string; timestamp: number },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`group_stream_${data.groupId}`).emit('group_stream_sync', data);
  }
}
