import { registerAs } from '@nestjs/config';
import { readString } from './config.helpers';

export const pushConfig = registerAs('push', () => ({
  vapidPublicKey: readString('VAPID_PUBLIC_KEY'),
  vapidPrivateKey: readString('VAPID_PRIVATE_KEY'),
  vapidSubject: readString('VAPID_SUBJECT'),
  firebaseProjectId: readString('FIREBASE_PROJECT_ID'),
  firebaseClientEmail: readString('FIREBASE_CLIENT_EMAIL'),
  // Stored in the environment with literal "\n" sequences; restored to real newlines here.
  firebasePrivateKey: readString('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
}));
