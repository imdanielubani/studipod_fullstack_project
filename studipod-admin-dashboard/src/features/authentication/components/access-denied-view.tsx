'use client';

import { format } from 'date-fns';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, TextButton } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';
import { getPublicLinks } from '@/config/env';

import { loadAuthApi } from '../api';
import { initialsFromEmail } from '../lib/email';
import { notifyRequestFailure } from '../lib/feedback';
import { useAuthFlowStore, type AccessDeniedState } from '../session/auth-flow-store';
import { IconBadge } from './auth-ui';

const COPY = {
  NOT_STAFF: {
    title: 'This account can’t use the admin console',
    description: (email: string) =>
      `${email} is a StudiPod candidate account. The admin console is only for StudiPod staff with an admin role.`,
  },
  NO_ADMIN_ROLE: {
    title: 'You don’t have an admin role',
    description: () =>
      'Your StudiPod account isn’t on the admin team yet. Ask a Super Admin to give you a role, or request access below.',
  },
} as const;

/** Shown when valid credentials belong to an account that is not an administrator. */
export function AccessDeniedView() {
  const router = useRouter();
  const denied = useAuthFlowStore((state) => state.accessDenied);

  useEffect(() => {
    if (!denied) router.replace('/sign-in');
  }, [denied, router]);

  if (!denied) return null;
  return <AccessDeniedContent denied={denied} />;
}

function AccessDeniedContent({ denied }: { denied: AccessDeniedState }) {
  const { webAppUrl } = getPublicLinks();
  const [requestState, setRequestState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const copy = COPY[denied.reason];
  const attemptedAt = format(new Date(denied.attemptedAt), 'd MMM yyyy, HH:mm');
  const referenceLine = [
    denied.reference ? `Reference ${denied.reference}` : null,
    attemptedAt,
    'This sign-in attempt was logged.',
  ]
    .filter(Boolean)
    .join(' · ');

  function leave() {
    // Clearing the state sends the visitor back to sign-in (see AccessDeniedView).
    useAuthFlowStore.getState().setAccessDenied(null);
  }

  async function handleRequestAccess() {
    if (!denied.accessRequestToken) return;
    setRequestState('sending');
    try {
      await (await loadAuthApi()).requestAccess({ accessRequestToken: denied.accessRequestToken });
      setRequestState('sent');
      notify.success({
        id: 'access-request-sent',
        title: 'Access request sent',
        description: 'A Super Admin will review it. You’ll be notified when it’s decided.',
      });
    } catch (error: unknown) {
      setRequestState('idle');
      notifyRequestFailure(error);
    }
  }

  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-5 text-center">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full bg-subtle px-3 py-1.5">
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center rounded-full bg-link text-micro text-white"
        >
          {initialsFromEmail(denied.email)}
        </span>
        <span className="text-caption break-all text-fg-secondary">
          Signed in as {denied.email}
        </span>
        <TextButton onClick={leave}>Not you? Sign out</TextButton>
      </div>

      <IconBadge icon={ShieldAlert} tone="danger" size="xl" />

      <div className="flex w-full flex-col items-center gap-2">
        <p className="text-overline font-semibold text-danger-fg uppercase">Access denied</p>
        <h1 className="text-h2 font-semibold text-fg">{copy.title}</h1>
        <p className="text-body-md text-fg-secondary">{copy.description(denied.email)}</p>
      </div>

      <p className="flex items-center gap-2 rounded-md bg-subtle px-3 py-2">
        <span className="text-caption text-fg-secondary">Required</span>
        <span className="font-mono text-[13px] leading-5 text-fg">StudiPod admin role</span>
      </p>

      <div className="flex w-full flex-col-reverse justify-center gap-3 sm:w-auto sm:flex-row">
        <Button variant="secondary" onClick={leave}>
          Back to sign in
        </Button>
        {denied.reason === 'NOT_STAFF' && webAppUrl ? (
          <a
            href={webAppUrl}
            className="inline-flex h-10 items-center justify-center rounded-md bg-action px-4 text-body-md font-medium text-on-brand hover:bg-action-hover focus-visible:shadow-focus focus-visible:outline-none"
          >
            Open the StudiPod app
          </a>
        ) : null}
        {denied.reason === 'NO_ADMIN_ROLE' && denied.accessRequestToken ? (
          <Button
            onClick={handleRequestAccess}
            disabled={requestState === 'sent'}
            isLoading={requestState === 'sending'}
            loadingLabel="Sending request…"
          >
            {requestState === 'sent' ? 'Request sent' : 'Request access'}
          </Button>
        ) : null}
      </div>

      <p className="text-caption text-fg-tertiary">{referenceLine}</p>
    </div>
  );
}
