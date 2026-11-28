import { notify } from '@/components/ui/toast';
import { isApiError } from '@/services/http/api-error';

/**
 * Toast for failures the user cannot fix in the form: no connection, or an
 * unexpected server error. Field and credential problems use inline alerts.
 */
export function notifyRequestFailure(error: unknown): void {
  if (isApiError(error) && error.isNetworkError) {
    notify.error({
      id: 'connection-problem',
      title: 'Connection problem',
      description: 'We couldn’t reach StudiPod. Check your connection and try again.',
    });
    return;
  }
  const reference = isApiError(error) ? error.requestId : undefined;
  notify.error({
    id: 'unexpected-error',
    title: 'Something went wrong',
    description: reference
      ? `Please try again. If it keeps happening, share reference ${reference} with a Super Admin.`
      : 'Please try again. If it keeps happening, contact a Super Admin.',
  });
}
