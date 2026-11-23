#!/usr/bin/env bash
# Prints freshly generated values for every secret the backend needs.
# Output goes to the terminal only: paste the values into Dokploy or your local .env.
# Run once per environment; never reuse values between development, staging and production.
#
#   ./infrastructure/scripts/generate-secrets.sh
set -euo pipefail

command -v openssl >/dev/null || { echo "openssl is required" >&2; exit 1; }

secret() { openssl rand -base64 64 | tr -d '\n=+/' | cut -c1-64; }
password() { openssl rand -base64 48 | tr -d '\n=+/' | cut -c1-40; }

# Assign first: a failed command substitution inside a heredoc would not trip set -e.
postgres_password=$(password)
redis_password=$(password)
jwt_access=$(secret)
jwt_refresh=$(secret)
jwt_admin_access=$(secret)
jwt_admin_refresh=$(secret)
cookie=$(secret)

cat <<EOF
POSTGRES_PASSWORD=${postgres_password}
REDIS_PASSWORD=${redis_password}
JWT_ACCESS_SECRET=${jwt_access}
JWT_REFRESH_SECRET=${jwt_refresh}
JWT_ADMIN_ACCESS_SECRET=${jwt_admin_access}
JWT_ADMIN_REFRESH_SECRET=${jwt_admin_refresh}
COOKIE_SECRET=${cookie}
EOF

echo
echo "# VAPID keys for Web Push: run  pnpm exec web-push generate-vapid-keys" >&2
