import type { AppLocale } from '@/i18n/config';
import type messages from '@/i18n/messages/en-GB.json';

declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
