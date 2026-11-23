# Authentication

**Status:** reserved (no implementation yet).

**Responsibility:** Registration, login, logout, access and refresh token issuance and rotation, password reset, email verification, and session revocation for candidates and administrators.

**Will own:** Credentials, refresh-token families, verification and reset tokens. Passport strategies go in `strategies/`; request and response DTOs go in `dto/`.

Follow the module conventions in [backend-architecture.md](../../../docs/architecture/backend-architecture.md#module-conventions).
