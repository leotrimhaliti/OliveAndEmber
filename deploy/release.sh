#!/bin/sh
set -eu

ENV_FILE="${ENV_FILE:-deploy/production.env}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.production.yaml}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:${APP_PORT:-8080}/ready}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Missing $ENV_FILE. Copy deploy/production.env.example and fill every secret." >&2
    exit 1
fi

require_value() {
    key="$1"
    value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
    if [ -z "$value" ]; then
        echo "Missing required value: $key" >&2
        exit 1
    fi
}

require_value APP_KEY
require_value APP_URL
require_value FRONTEND_URL
require_value SEO_INDEXING_ENABLED
require_value DB_HOST
require_value DB_DATABASE
require_value DB_USERNAME
require_value DB_PASSWORD
require_value SANCTUM_STATEFUL_DOMAINS
require_value MAIL_MAILER
require_value MAIL_HOST
require_value MAIL_FROM_ADDRESS

require_setting() {
    key="$1"
    expected="$2"
    if ! grep -Eq "^${key}=${expected}$" "$ENV_FILE"; then
        echo "$key must be set to $expected for a production release." >&2
        exit 1
    fi
}

require_setting APP_ENV production
require_setting APP_DEBUG false
require_setting SESSION_SECURE_COOKIE true
require_setting MYSQL_ATTR_SSL_VERIFY_SERVER_CERT true
require_setting MAIL_MAILER smtp

if ! grep -Eq '^SEO_INDEXING_ENABLED=(true|false)$' "$ENV_FILE"; then
    echo "SEO_INDEXING_ENABLED must be true or false." >&2
    exit 1
fi

if ! grep -Eq '^APP_URL=https://' "$ENV_FILE"; then
    echo "APP_URL must use HTTPS." >&2
    exit 1
fi

if ! grep -Eq '^FRONTEND_URL=https://' "$ENV_FILE"; then
    echo "FRONTEND_URL must use HTTPS." >&2
    exit 1
fi

if grep -Eq '^(APP_URL|FRONTEND_URL|DB_HOST|MAIL_HOST|MAIL_FROM_ADDRESS)=.*example\.(com|internal)' "$ENV_FILE"; then
    echo "Replace the example production host values before releasing." >&2
    exit 1
fi

export IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build --pull
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm app php artisan migrate --force
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

attempt=1
while [ "$attempt" -le 30 ]; do
    if curl --fail --silent --show-error "$HEALTHCHECK_URL" >/dev/null; then
        echo "Release $IMAGE_TAG is ready at $HEALTHCHECK_URL"
        exit 0
    fi

    attempt=$((attempt + 1))
    sleep 2
done

echo "Release started, but readiness did not pass: $HEALTHCHECK_URL" >&2
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps >&2
exit 1
