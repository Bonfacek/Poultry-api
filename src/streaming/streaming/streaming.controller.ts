import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { FrameIngestDto } from '../dto/frame-request';

@Controller('streaming')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) { }

  // Camera devices POST frames here
  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingestFrame(@Body() dto: FrameIngestDto) {
    return this.streamingService.ingestFrame(dto);
  }

  // UI can also poll latest frame via HTTP 
  @Get('frame/:coopId')
  async getLatestFrame(@Param('coopId') coopId: string) {
    const frame = await this.streamingService.getLatestFrame(coopId);
    if (!frame) {
      return { success: false, error: 'No frame available for this coop' };
    }
    return { success: true, coopId, ...frame };
  }

  // Get all coops currently streaming
  @Get('active-coops')
  async getActiveCoops() {
    const coops = await this.streamingService.getActiveCoops();
    return { success: true, coops };
  }
}
