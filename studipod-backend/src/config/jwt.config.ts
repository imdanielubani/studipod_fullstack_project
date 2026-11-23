import { registerAs } from '@nestjs/config';
import { readString } from './config.helpers';

// Candidate and administrator tokens use separate secrets and audiences so a
// candidate token can never be replayed against admin routes.
export const jwtConfig = registerAs('jwt', () => ({
  issuer: readString('JWT_ISSUER', 'studipod-api'),
  candidate: {
    audience: readString('JWT_CANDIDATE_AUDIENCE', 'studipod-webapp'),
    accessSecret: readString('JWT_ACCESS_SECRET'),
    accessTtl: readString('JWT_ACCESS_TTL', '15m'),
    refreshSecret: readString('JWT_REFRESH_SECRET'),
    refreshTtl: readString('JWT_REFRESH_TTL', '30d'),
  },
  admin: {
    audience: readString('JWT_ADMIN_AUDIENCE', 'studipod-admin'),
    accessSecret: readString('JWT_ADMIN_ACCESS_SECRET'),
    accessTtl: readString('JWT_ADMIN_ACCESS_TTL', '10m'),
    refreshSecret: readString('JWT_ADMIN_REFRESH_SECRET'),
    refreshTtl: readString('JWT_ADMIN_REFRESH_TTL', '12h'),
  },
  cookieSecret: readString('COOKIE_SECRET'),
}));
