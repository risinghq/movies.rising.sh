# Development

Owner: project maintainers.

## Prerequisites

Install [mise](https://mise.jdx.dev), then run `mise install`. It installs the
Bun and Node versions that `mise.toml` pins. `bun install --frozen-lockfile`
installs Vite+ from `bun.lock`, and mise puts `node_modules/.bin` on the path.
The scripts in `package.json` are the project commands. `bun run` lists them.
Vite+ runs behind them.

## Local setup

Local configuration is a single `.env` file. `env.ts` defines these names:

| Variable                 | Required | Use                                                         |
| ------------------------ | -------- | ----------------------------------------------------------- |
| `BETTER_AUTH_SECRET`     | Yes      | Better Auth secret                                          |
| `TMDB_READ_ACCESS_TOKEN` | No       | Remote TMDB search, cache-on-select, and metadata hydration |
| `ADMIN_EMAIL`            | No       | Gives the matching newly created user the `admin` role      |
| `TRAKT_CLIENT_ID`        | No       | Trakt import; the public client ID of the Trakt app         |

Create the required secret, install packages, and start the app:

```sh
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 48)" > .env
bun install --frozen-lockfile
bun run dev
```

The `dev` script first runs `setup`, which executes `bun scripts/setup.ts`.
Setup reads the generated Better Auth schema, applies pending migrations with
`vp exec void db migrate`, and inserts the committed rows from
`db/fixtures/media.json` through a temporary SQL file. It does not need a
network connection or a TMDB token. The seed path in `db/seed.ts` also uses only
committed fixtures.

## Checks and tests

```sh
bun run check
bun run fix
```

`check` runs `lint`, `typecheck`, `test`, and `build`, and writes nothing
tracked. `lint` runs `vp lint --deny-warnings` and `vp fmt --check`. `fix`
applies safe lint fixes and formats every file. `test` runs the JavaScript
tests.

`lint`, `fix`, `typecheck`, `test`, and `build` first run `typegen`, which
generates the `.void/*` types without starting Vite. Run it by hand when the
types are missing or stale:

```sh
bun run typegen
```

Markdown, YAML, and JSON are formatted at 80 columns with prose wrapping.

## Database operations

Keep migration, seed, and deploy as separate operations.

```sh
bun run db:migrate
bun run db:seed
bun run db:seed:remote
```

The first two run `vp exec void db migrate` and `vp exec void db seed`.
`db:seed:remote` loads `db/fixtures/media.json` into the deployed D1 database
with `INSERT OR IGNORE`, so it never overwrites existing rows. Remote migrations
need no script: `void deploy` applies them. Void also provides these direct
operations:

```sh
vp exec void db generate
vp exec void db reset
vp exec void db seed
```

`db generate` creates migration SQL from schema changes. `db reset` drops and
re-applies migrations. `db seed` resets the local database, reapplies
migrations, and runs the default `db/seed.ts` file. Use the local Void CLI
reference at `node_modules/void/docs/reference/cli.md` for flags.

## Fixture refresh

The committed fixture file is enough for local setup. To refresh it from TMDB,
put `TMDB_READ_ACCESS_TOKEN` in `.env` and run:

```sh
bun run fixtures:fetch
bun run fixtures:trending
```

The first command fetches the configured top-rated and trending movie and show
sets. The second refreshes trending rows while preserving existing items that
are outside the fetched set. Both commands write `db/fixtures/media.json` and
`db/fixtures/meta.json`.

## Deployment

The app runs as the Cloudflare Worker `movies` on the rising account and serves
https://movies.rising.sh. `void.config.ts` names the Worker and its custom
domain. The deploy script runs `vp exec void deploy --platform cloudflare`. It
builds the app, saves a D1 restore point, applies pending migrations, uploads
the Worker, and attaches the domain. It records the D1 database and the queue it
provisions in `void.lock.json`. Commit that file, so later deploys reuse the
same resources.

```sh
bun run release
```

`release` runs `check`, then `deploy`. A deploy reads three environment
variables:

- `CLOUDFLARE_API_TOKEN`: a token with Workers Scripts, D1, Queues and Workers
  Routes write access, and DNS write on the `rising.sh` zone.
- `CLOUDFLARE_ACCOUNT_ID`: the rising account.
- `CLOUDFLARE_WORKERS_SUBDOMAIN`: `empirical`, the account's workers.dev
  subdomain.

The Worker reads `BETTER_AUTH_SECRET`, which is required, and
`TMDB_READ_ACCESS_TOKEN`, `TRAKT_CLIENT_ID` and `ADMIN_EMAIL`, which are
optional. They are Worker secrets. Run
`vp exec void connect --platform cloudflare` once to save the target, then set
each secret with `vp exec void secret put <NAME>=<value>`.

After the first deploy to an empty database, load the catalog with
`bun run db:seed:remote`.

The CI deployment workflow runs on pushes to `master`. It runs
`bun install --frozen-lockfile`, `check`, and `deploy`. The token and account ID
come from the `risinghq` organization secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`. Do not add repository copies, because a repository
secret overrides the organization secret. Do not put credentials in this
repository.

## Local queues and crons

Queue messages are processed by the local Void runtime. Scheduled jobs do not
fire automatically during local development. Trigger the scheduled endpoint with
a `POST` request to:

```text
/__void/scheduled
```

The reconcile job enqueues at most 50 due media rows per run and is scheduled
every 15 minutes in `crons/reconcile.ts`.

## Inspecting local data

`vp dev` uses Miniflare D1. It is not the same database as the CLI's D1. Inspect
development data under:

```text
.void/v3/d1/miniflare-D1DatabaseObject/*.sqlite
```

Stop a process listening on the default development port with:

```sh
fuser -k 5173/tcp
```

Use `python3` to query the SQLite file. The `sqlite3` CLI binary hangs in this
environment.
