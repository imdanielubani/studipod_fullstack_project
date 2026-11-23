import { registerAs } from '@nestjs/config';
import { readBool, readInt, readList, readString } from './config.helpers';

export type AppEnvironment = 'development' | 'test' | 'staging' | 'production';

export const appConfig = registerAs('app', () => ({
  environment: readString('APP_ENV', 'development') as AppEnvironment,
  host: readString('HOST', '0.0.0.0'),
  port: readInt('PORT', 3000),
  websocketPort: readInt('WS_PORT', 3001),
  apiPrefix: readString('API_PREFIX', 'api'),
  apiVersion: readString('API_VERSION', '1'),
  publicUrl: readString('APP_PUBLIC_URL', 'http://localhost:3000'),
  webappUrl: readString('WEBAPP_URL', 'http://localhost:3100'),
  adminDashboardUrl: readString('ADMIN_DASHBOARD_URL', 'http://localhost:3200'),
  trustProxyHops: readInt('TRUST_PROXY_HOPS', 0),
  logLevel: readString('LOG_LEVEL', 'info'),
  swaggerEnabled: readBool('SWAGGER_ENABLED', false),
  cors: {
    allowedOrigins: readList('CORS_ALLOWED_ORIGINS'),
  },
  rateLimit: {
    ttlSeconds: readInt('RATE_LIMIT_TTL_SECONDS', 60),
    max: readInt('RATE_LIMIT_MAX', 100),
    authMax: readInt('RATE_LIMIT_AUTH_MAX', 10),
  },
  passwordHashing: {
    // Argon2id parameters. Defaults follow the OWASP Password Storage Cheat Sheet minimum.
    memoryKib: readInt('ARGON2_MEMORY_KIB', 19456),
    timeCost: readInt('ARGON2_TIME_COST', 2),
    parallelism: readInt('ARGON2_PARALLELISM', 1),
  },
}));
