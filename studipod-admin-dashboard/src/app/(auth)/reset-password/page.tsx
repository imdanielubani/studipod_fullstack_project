import type { Metadata } from 'next';

import { ResetPasswordForm } from '@/features/authentication/components/reset-password-form';

export const metadata: Metadata = {
  title: 'Choose a new password',
  // The reset token is in the URL: never send it to other origins.
  referrer: 'no-referrer',
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;
  const value = typeof token === 'string' && token.trim() ? token.trim() : null;
  return <ResetPasswordForm token={value} />;
}
