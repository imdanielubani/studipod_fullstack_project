# k6 HTTP load tests

**Status:** no scenarios yet.

k6 is a standalone binary, not an npm dependency: install it from https://grafana.com/docs/k6/latest/set-up/install-k6/ and run `pnpm test:load:k6 test/load/k6/<scenario>.js`.

Scenarios run against **staging only**, using synthetic accounts, with thresholds taken from the performance budgets in [scalability.md](../../../docs/architecture/scalability.md#performance-budgets-initial-targets-to-be-validated).
