/**
 * Liveness probe for Docker, Dokploy and uptime monitoring.
 * Reports only that the Next.js server process is serving requests; it does not call
 * the backend, so an API outage never restarts the webapp container.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
