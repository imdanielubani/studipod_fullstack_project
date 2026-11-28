import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { notify, Toaster } from './toast';

describe('notify', () => {
  it('shows a success toast politely with a dismiss button', async () => {
    render(<Toaster />);
    act(() => {
      notify.success({ title: 'Code sent', description: 'Check your inbox.' });
    });

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('Code sent');
    expect(toast).toHaveTextContent('Check your inbox.');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  });

  it('announces errors assertively', async () => {
    render(<Toaster />);
    act(() => {
      notify.error({ title: 'Connection problem' });
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Connection problem');
  });
});
