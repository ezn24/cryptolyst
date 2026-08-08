# Cryptolyst

Cryptolyst is a self-hosted crypto trade journal and portfolio analytics app for a single user. It tracks assets, independent buy lots, unlimited partial sales, realized/unrealized P&L, profit targets, current prices, CSV export, JSON backup, and a dry-run legacy Excel importer.

![Screenshot placeholder](public/screenshot-placeholder.svg)

## Stack

- Next.js App Router, TypeScript, React Server Components, Server Actions
- Tailwind CSS, Lucide Icons, Recharts
- Prisma ORM with SQLite
- Decimal arithmetic via `decimal.js`
- Password login with bcrypt hash and HttpOnly cookie session
- Docker Compose deployment for Synology NAS

## Local Development

```bash
npm install
npm run db:generate
npm run db:init
npm run seed
npm run dev
```

Open `http://localhost:3000`.

Create a password hash:

```bash
npm run hash-password -- "your-password"
```

The command prints a complete `APP_PASSWORD_HASH` line that is safe to paste into
Next.js `.env`. The backslashes are required because Next.js expands unescaped
`$` characters in environment values.

Set `.env` using the generated line:

```env
APP_PASSWORD_HASH='\$2b\$12\$...'
SESSION_SECRET=<at-least-32-random-characters>
DATABASE_URL=file:./dev.db
PRICE_PROVIDER=coingecko
PRICE_REFRESH_INTERVAL_MINUTES=5
TZ=Asia/Hong_Kong
```

Do not commit `.env`.

## Database

The Prisma schema is in `prisma/schema.prisma`. In this environment, Prisma schema-engine failed with an empty engine error, so the app includes an idempotent SQLite initializer:

```bash
npm run db:init
```

This creates the same tables and indexes defined by the Prisma models and is used by Docker startup. If Prisma migration works on your host, you can switch back to:

```bash
npm run db:migrate
```

## Tests

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Docker

Build and run:

```bash
docker compose up -d --build
```

The app listens on host port `8088` and stores SQLite data under `/data/cryptolyst.db` inside the container.

`compose.yml` maps Synology storage:

```yaml
volumes:
  - /volume2/docker/cryptolyst/data:/data
```

Create the folder on Synology:

```bash
mkdir -p /volume2/docker/cryptolyst/data
chown -R 10001:10001 /volume2/docker/cryptolyst/data
```

## Synology Reverse Proxy

Recommended external URL:

```text
https://cryptolyst.example.com
```

Synology Reverse Proxy:

- Source protocol: HTTPS
- Source hostname: `cryptolyst.example.com`
- Source port: `443`
- Destination protocol: HTTP
- Destination hostname: NAS IP or `localhost`
- Destination port: `8088`

Production cookies are `Secure`, `HttpOnly`, and `SameSite=Lax`.

## Backup

Preferred SQLite backup while the app may be writing:

```bash
sqlite3 /volume2/docker/cryptolyst/data/cryptolyst.db \
  ".backup '/volume2/docker/cryptolyst/backups/cryptolyst-$(date +%F-%H%M).db'"
```

Simple offline copy:

```bash
cp /volume2/docker/cryptolyst/data/cryptolyst.db \
   /volume2/docker/cryptolyst/backups/cryptolyst-$(date +%F-%H%M).db
```

JSON export is available at `/import-export`.

## Legacy Excel Import

Dry-run:

```bash
npm run import:legacy -- "C:\Users\EZ24\Nextcloud\Documents\加密貨幣交易記錄 2.0.xlsx"
```

Commit recognized asset shell records:

```bash
npm run import:legacy -- "C:\Users\EZ24\Nextcloud\Documents\加密貨幣交易記錄 2.0.xlsx" --commit
```

The importer currently reports workbook/sheet shape and creates asset shell records only. It does not trust Excel-calculated P&L. Lot/sale column mapping should be reviewed before committing historical trade rows.

## Price APIs

- CoinGecko uses `coingeckoId` and `/coins/markets` for price, 24-hour change, and coin images.
- Binance uses public ticker API and `binanceSymbol`, no API key.
- Failed price updates keep the last valid price and log the error.

A manually configured icon URL always takes precedence. To fill missing icons for
existing assets from CoinGecko:

```bash
npm run sync-icons
```

This sends the configured CoinGecko IDs to CoinGecko and stores the returned image URLs.

## Security Notes

- No exchange API keys or private keys are used.
- All mutations require a session.
- Passwords are compared against `APP_PASSWORD_HASH`; plaintext passwords are never stored.
- Financial calculations are recomputed on the server and use Decimal arithmetic.

## Known Gaps

- Edit forms are not yet exposed for all records; create/delete flows are implemented.
- CSV import preview/commit UI is not implemented yet.
- Excel importer is a dry-run/shell importer and needs workbook-specific column mapping before full migration.
- Background interval price refresh is represented by manual/protected update; a long-running interval can be added in production if desired.
