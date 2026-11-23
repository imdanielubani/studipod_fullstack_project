# Administration

**Status:** reserved (no implementation yet).

**Responsibility:** everything the Admin Dashboard needs that candidates must never reach. All routes will be served under `/api/v1/admin/*` and require an administrator token plus a permission check.

| Submodule         | Responsibility                                                                   |
| ----------------- | -------------------------------------------------------------------------------- |
| `administrators/` | Administrator accounts (separate from candidate accounts), MFA enrolment, status |
| `roles/`          | Named roles (for example super admin, moderator, support) that group permissions |
| `permissions/`    | Fine-grained permission catalogue (`resource:action`) checked by guards          |
| `audit-logs/`     | Append-only record of privileged and security-relevant actions                   |

`admin.module.ts` will aggregate these submodules when implementation starts.

See [authentication-architecture.md](../../../docs/security/authentication-architecture.md) and [security-standards.md](../../../docs/security/security-standards.md#audit-logging).
