import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { StreamingGateway } from './streaming.gateway';
import { FrameIngestDto } from '../dto/frame-request';

@Injectable()
export class StreamingService {
  constructor(
    @InjectRedis() private redis: Redis,
    private gateway: StreamingGateway,
  ) { }

  // Called by camera/device to push a new frame
  async ingestFrame(dto: FrameIngestDto): Promise<{ success: boolean }> {
    const frameData = {
      data: dto.data,
      timestamp: dto.timestamp || new Date().toISOString(),
      deviceId: dto.deviceId,
    };

    // Store latest frame in Redis with 30s TTL
    await this.redis.set(
      `frame:${dto.coopId}`,
      JSON.stringify(frameData),
      'EX',
      30,
    );

    // Broadcast to all subscribed UI clients
    this.gateway.broadcastFrame(dto.coopId, frameData);

    return { success: true };
  }

  // Get latest frame for a coop
  async getLatestFrame(coopId: string) {
    const raw = await this.redis.get(`frame:${coopId}`);
    if (!raw) return null;
    const frame = JSON.parse(raw);
    return {
      ...frame,
      age: Math.floor((Date.now() - new Date(frame.timestamp).getTime()) / 1000),
    };
  }

  // Get all active coops that have recent frames
  async getActiveCoops(): Promise<string[]> {
    const keys = await this.redis.keys('frame:*');
    return keys.map(k => k.replace('frame:', ''));
  }
}