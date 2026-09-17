# Production deployment

This release setup serves the React application and Laravel endpoints from one HTTPS origin. An edge proxy or load balancer terminates TLS and forwards traffic to the `web` container on port 8080. Nginx serves the built SPA, sends `/api`, `/sanctum`, `/up`, and `/ready` to the private PHP-FPM container, and falls back to `index.html` for client-side routes. The application connects to a separately managed MySQL service; production Compose intentionally does not create a database container.

## What the host needs

- A Linux host or container platform with Docker Engine and Docker Compose v2.
- A domain with HTTPS. Redirect HTTP to HTTPS at the load balancer or edge proxy.
- A MySQL 8.4-compatible managed database reachable from the application network.
- Provider-managed encrypted storage, automated backups, and point-in-time recovery enabled for the database.
- Outbound HTTPS access for the catalog's external fonts and images.

Keep PHP-FPM private. Only the Nginx `web` service publishes a port. `TRUSTED_PROXIES=*` is appropriate for this topology because PHP-FPM is reachable only through the internal Compose network. Restrict it to explicit proxy CIDRs if the application container is ever placed on a shared or directly reachable network.

## Provision staging

Create staging before production and use a separate domain, database, database user, and application key. For the database:

1. Create a MySQL 8.4 instance in the same region and private network as the application host.
2. Create an empty `olive_and_ember_staging` database and a dedicated login with privileges only on that database. Do not use the provider's root account.
3. Require TLS connections. The supplied image uses the operating system CA bundle and verifies the database hostname. If the provider uses a private CA, add its certificate to the app image or mount it read-only and set `MYSQL_ATTR_SSL_CA` to that path.
4. Enable daily automated backups, at least seven days of retention, point-in-time recovery where available, encryption at rest, and deletion protection.
5. Allow inbound database traffic only from the application host or its private network/security group.

Point the staging domain at the HTTPS load balancer or host, and forward requests to port 8080. Use `/up` for a liveness probe and `/ready` for readiness; readiness returns 503 when Laravel cannot query MySQL.

## Configure secrets

On the deployment host:

```sh
cp deploy/production.env.example deploy/production.env
chmod 600 deploy/production.env
docker run --rm php:8.4-cli php -r 'echo "base64:".base64_encode(random_bytes(32)).PHP_EOL;'
```

Put the generated value in `APP_KEY`, then replace every example host and database value. `deploy/production.env` is ignored by Git. Use the platform's secret manager instead of a file when it can inject the same environment variables directly.

The values that require special care are:

- `APP_URL`: the public HTTPS origin, with no path.
- `APP_KEY`: a unique generated key per environment. Back it up securely; changing it invalidates encrypted cookies and data.
- `DB_*`: the least-privilege managed MySQL connection. Never reuse the local demo password.
- `SANCTUM_STATEFUL_DOMAINS`: the public hostname, without a URL scheme.
- `SESSION_DOMAIN`: leave blank for a host-only cookie unless subdomains must share the session.
- `ADMIN_INVITATION_CODE`: leave blank to disable administrator registration, or use a random value and rotate it after onboarding.

The example enables secure, HTTP-only, encrypted, same-site session cookies; disables debug output; sends logs to stderr; verifies database TLS; and uses database-backed cache and sessions so containers remain disposable.

## Release

Run releases from a clean checkout of the commit being deployed:

```sh
chmod +x deploy/release.sh deploy/app-entrypoint.sh
./deploy/release.sh
```

The script validates required settings, rejects the example hosts, tags images with the current Git commit, validates Compose, builds both images, applies migrations once with `--force`, starts the release, and waits for database-backed readiness. Set `HEALTHCHECK_URL` when the probe must use the public staging URL. Set `APP_PORT` when port 8080 is unavailable.

The CI workflow builds both production images and validates the shell and Nginx configuration on every push and pull request. Promote the exact tested commit from staging to production. After release, smoke-test registration/login, catalog loading, checkout, order ownership, administrator product changes, and status updates.

## Migration and rollback policy

The release script migrates before switching containers, so every production migration must be backward compatible with the currently running application. Add nullable columns or new tables first, deploy code that supports both schemas, backfill separately, and remove old columns in a later release.

Each image tag is its Git commit. For an application-only rollback, select the last known good tag and restart without rebuilding:

```sh
IMAGE_TAG=<previous-commit> docker compose --env-file deploy/production.env -f compose.production.yaml up -d
curl --fail https://app.example.com/ready
```

Do not run `migrate:rollback` automatically. If a failed release changed data or used an incompatible schema, put the site in maintenance mode, restore the pre-release database backup to a new database instance, point the environment at it, start the previous image tag, verify `/ready`, and then restore traffic. Keep the failed database for investigation until the recovery is accepted.

## Backups and restoration

Use managed-database snapshots and point-in-time recovery as the primary backup. Create an on-demand snapshot immediately before any schema-changing release. Monitor backup failures and keep backup retention separate from the application host.

For an additional logical backup, run `mysqldump` from an authorized administrative workstation with TLS verification and write the output to encrypted storage:

```sh
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USERNAME" \
  --ssl-mode=VERIFY_IDENTITY --ssl-ca="$MYSQL_ATTR_SSL_CA" \
  --single-transaction --routines --triggers "$DB_DATABASE" > olive-and-ember.sql
```

Test restoration at least quarterly. Restore into a new empty database, apply the same restricted access controls, and verify it before switching anything:

```sh
MYSQL_PWD="$RESTORE_DB_PASSWORD" mysql \
  --host="$RESTORE_DB_HOST" --port="$RESTORE_DB_PORT" --user="$RESTORE_DB_USERNAME" \
  --ssl-mode=VERIFY_IDENTITY --ssl-ca="$MYSQL_ATTR_SSL_CA" \
  "$RESTORE_DB_DATABASE" < olive-and-ember.sql
```

Point a temporary application release at the restored database, confirm `/ready`, compare order/product counts, and complete a read-only login/order-history smoke test. Record the recovery time and any missing steps.
