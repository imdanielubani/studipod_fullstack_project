import { registerAs } from '@nestjs/config';
import { readInt, readString } from './config.helpers';

const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const storageConfig = registerAs('storage', () => {
  const accountId = readString('R2_ACCOUNT_ID');
  const derivedEndpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '';
  return {
    accountId,
    endpoint: readString('R2_ENDPOINT', derivedEndpoint),
    accessKeyId: readString('R2_ACCESS_KEY_ID'),
    secretAccessKey: readString('R2_SECRET_ACCESS_KEY'),
    privateBucket: readString('R2_PRIVATE_BUCKET'),
    publicBucket: readString('R2_PUBLIC_BUCKET'),
    publicBaseUrl: readString('R2_PUBLIC_BASE_URL'),
    signedUrlTtlSeconds: readInt('STORAGE_SIGNED_URL_TTL_SECONDS', 300),
    maxUploadBytes: readInt('STORAGE_MAX_UPLOAD_BYTES', DEFAULT_MAX_UPLOAD_BYTES),
  };
});
