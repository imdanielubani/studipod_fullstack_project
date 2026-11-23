import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { emailConfig } from './email.config';
import { jwtConfig } from './jwt.config';
import { paymentConfig } from './payment.config';
import { pushConfig } from './push.config';
import { redisConfig } from './redis.config';
import { storageConfig } from './storage.config';
import { videoConfig } from './video.config';

// Every configuration namespace, loaded once by ConfigModule in AppModule.
export const configurations = [
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  storageConfig,
  paymentConfig,
  emailConfig,
  videoConfig,
  pushConfig,
];
