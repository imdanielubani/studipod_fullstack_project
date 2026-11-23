import { registerAs } from '@nestjs/config';
import { readString } from './config.helpers';

export const paymentConfig = registerAs('payment', () => ({
  stripeSecretKey: readString('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: readString('STRIPE_WEBHOOK_SECRET'),
}));
