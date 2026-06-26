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
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'stream',
})
export class StreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        console.log(` No credentials provided for socket ${client.id}`);
        client.disconnect();
        return;
      }

      const decodedPayload = await this.jwtService.verifyAsync(token);
      
      client.data.user = decodedPayload;
      console.log(`Handshake Verified: User "${decodedPayload.username || 'Farmer'}" bound to ${client.id}`);
      
    } catch (error) {
      console.log(`Handshake Denied: Token signature verification failed on socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('get_frame')
  async handleGetFrame(
    @MessageBody() data: { coopId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { coopId } = data;
    try {
      const raw = await this.redis.get(`frame:${coopId}`);
      if (!raw) {
        client.emit('frame_response', {
          success: false,
          coopId,
          error: 'No frame available',
        });
        return;
      }
      const frame = JSON.parse(raw);
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
      client.disconnect();
    }
  }

  // Subscribe to live stream - joins a room for a specific coop
  @SubscribeMessage('subscribe_coop')
  async handleSubscribeCoop(
    @MessageBody() data: { coopId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { coopId } = data;
    const user = client.data.user; 

    if (!user) {
      client.emit('error_alert', { message: 'Authentication contexts are missing.' });
      client.disconnect();
      return;
    }
    const isFarmManager = user.roles?.includes('ADMIN') || user.roles?.includes('FARMER');
    const hasAccessToPen = user.assignedCoops?.includes(coopId);

    if (!isFarmManager && !hasAccessToPen) {
      client.emit('error_alert', { message: `Authorization Denied: You cannot view stream assets for ${coopId}.` });
      return;
    }

    // If approved, permit entry into the isolated stream room
    await client.join(`coop:${coopId}`);
    client.emit('subscribed', { coopId, message: `Access Authorized for coop ${coopId}` });
  }

  // Unsubscribe from live stream
  @SubscribeMessage('unsubscribe_coop')
  async handleUnsubscribeCoop(
    @MessageBody() data: { coopId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { coopId } = data;
    await client.leave(`coop:${coopId}`);
    client.emit('unsubscribed', { coopId });
  }

  // Called by the controller when a new frame arrives
  broadcastFrame(coopId: string, frameData: any) {
    this.server.to(`coop:${coopId}`).emit('live_frame', {
      coopId,
      frame: frameData.data,
      timestamp: frameData.timestamp,
      age: this.getFrameAge(frameData.timestamp),
    });
  }

  private getFrameAge(timestamp: string): number {
    return Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  }
}
