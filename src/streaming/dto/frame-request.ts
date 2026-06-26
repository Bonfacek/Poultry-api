export class FrameRequestDto {
  coopId: string;
}

export class FrameIngestDto {
  coopId: string;
  data: string;      // base64 encoded frame
  timestamp: string;
  deviceId?: string;
}