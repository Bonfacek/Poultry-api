import { Module } from '@nestjs/common';
import { StreamingController } from '../streaming/streaming.controller';
import { StreamingGateway } from '../streaming/streaming.gateway';
import { StreamingService } from '../streaming/streaming.service';


@Module({
  controllers: [StreamingController],
  providers: [StreamingService, StreamingGateway],
  exports: [StreamingService],
})
export class StreamingModule {}