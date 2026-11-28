import type { Metadata } from 'next';

import { VerifyCodeForm } from '@/features/authentication/components/verify-code-form';

export const metadata: Metadata = { title: 'Check your email' };

export default function VerifyCodePage() {
  return <VerifyCodeForm />;
}
