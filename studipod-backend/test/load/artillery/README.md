# Artillery load tests

**Status:** no scenarios yet.

Artillery (installed as a dev dependency) covers Socket.IO scenarios: connect, authenticate, join a conversation, send and receive. Run with `pnpm test:load:artillery test/load/artillery/<scenario>.yml`.

Scenarios run against **staging only**, using synthetic accounts. The bundled browser engine is not installed (its Chromium download is denied in `pnpm-workspace.yaml`); HTTP and Socket.IO engines do not need it.
