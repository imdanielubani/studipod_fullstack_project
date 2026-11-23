import { registerAs } from '@nestjs/config';
import { readString } from './config.helpers';

export const redisConfig = registerAs('redis', () => ({
  url: readString('REDIS_URL', 'redis://localhost:6379'),
  keyPrefix: readString('REDIS_KEY_PREFIX', 'studipod:'),
  queuePrefix: readString('BULLMQ_PREFIX', 'studipod:queue'),
}));
