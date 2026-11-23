import { registerAs } from '@nestjs/config';
import { readString } from './config.helpers';

export const emailConfig = registerAs('email', () => ({
  resendApiKey: readString('RESEND_API_KEY'),
  resendWebhookSecret: readString('RESEND_WEBHOOK_SECRET'),
  from: readString('EMAIL_FROM', 'Studipod <no-reply@example.com>'),
  replyTo: readString('EMAIL_REPLY_TO'),
}));
