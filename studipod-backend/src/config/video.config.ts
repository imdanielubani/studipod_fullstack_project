import { registerAs } from '@nestjs/config';
import { readInt, readString } from './config.helpers';

export const videoConfig = registerAs('video', () => ({
  livekitUrl: readString('LIVEKIT_URL'),
  livekitApiKey: readString('LIVEKIT_API_KEY'),
  livekitApiSecret: readString('LIVEKIT_API_SECRET'),
  tokenTtlSeconds: readInt('LIVEKIT_TOKEN_TTL_SECONDS', 3600),
}));
