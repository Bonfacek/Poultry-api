// src/streaming/streaming.gateway.ts
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
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'stream',
})
export class StreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(@InjectRedis() private redis: Redis) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Frontend requests a frame
  @SubscribeMessage('get_frame')
  async handleGetFrame(
    @MessageBody() data: { coopId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { coopId } = data;

    try {
      // Fetch latest frame from Redis
      const raw = await this.redis.get(`frame:${coopId}`);

      if (!raw) {
        // Respond ONLY to requesting client
        client.emit('frame_response', {
          success: false,
          coopId,
          error: 'No frame available',
        });
        return;
      }

      const frame = JSON.parse(raw);

      // Respond ONLY to the client that requested
      client.emit('frame_response', {
        success: true,
        coopId,
        frame: frame.data,
        timestamp: frame.timestamp,
        age: this.getFrameAge(frame.timestamp),
      });

    } catch (error) {
      client.emit('frame_response', {
        success: false,
        coopId,
        error: 'Failed to fetch frame',
      });
    }
  }

  private getFrameAge(timestamp: string): number {
    return Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  }
}