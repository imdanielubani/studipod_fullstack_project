# Monitoring and observability

The plan is staged so the first deployment stays small, with clear triggers for adding more.

## Stage 1: first production deployment

| Signal       | Tool                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Logs         | Structured JSON logs (`nestjs-pino`) to stdout, rotated by the Docker `json-file` driver (`max-size: 20m`, `max-file: 5`), viewed in Dokploy |
| Uptime       | External HTTP check on `https://api.<domain>/api/v1/health/live` every minute (any external uptime service), alerting to email               |
| Readiness    | `/api/v1/health/ready` checks PostgreSQL and Valkey; used by the container health check once the health module exists                        |
| Host metrics | Dokploy built-in server monitoring (CPU, memory, disk)                                                                                       |
| Errors       | Unhandled exceptions logged at `error` with a request ID                                                                                     |

Log rules: every request carries a request ID (`x-request-id`, generated when absent). Never log passwords, tokens, cookies, `Authorization` headers, full card data, or message bodies. Pino `redact` paths enforce this.

## Stage 2: when there are paying users or more than one API replica

- Prometheus metrics endpoint on a private port (HTTP latency histograms, BullMQ queue depth and failure counts, Socket.IO connection counts, Prisma pool usage).
- Grafana with Prometheus and Loki, run on a separate small monitoring host (not on the application VPS) so a saturated VPS does not also take monitoring down.
- `postgres_exporter` and `redis_exporter` (Valkey-compatible) for database and cache metrics.
- OpenTelemetry tracing across API, gateway and worker.

## Alerts (minimum)

| Condition                                                                   | Severity |
| --------------------------------------------------------------------------- | -------- |
| Health check failing for 3 minutes                                          | Page     |
| 5xx rate above 2% for 5 minutes                                             | Page     |
| Disk usage above 80%                                                        | Warn     |
| BullMQ failed jobs growing, or queue backlog above threshold for 10 minutes | Warn     |
| Nightly backup did not upload                                               | Warn     |
| TLS certificate expiring within 14 days                                     | Warn     |
