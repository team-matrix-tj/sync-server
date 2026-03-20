# Sync Server MVP

Production-minded MVP backend for a desktop sync application. The server is built around **NestJS + Prisma + PostgreSQL** and uses **local disk storage** for revision payloads, while PostgreSQL stores only sync metadata.

## What this MVP does

- Creates sync workspaces.
- Registers client devices and issues device tokens.
- Accepts batched sync pushes with `upsert` and `delete` changes.
- Stores immutable file revisions on local disk.
- Detects `baseRevisionId` conflicts without failing the whole batch.
- Exposes ordered event pull by cursor for downstream clients.
- Keeps the storage layer abstract so disk storage can later be replaced with S3/MinIO.

## Project tree

```text
.
├── docker-compose.yml
├── .env.example
├── nest-cli.json
├── package.json
├── prisma
│   ├── migrations
│   │   └── 20260320120000_init
│   │       └── migration.sql
│   └── schema.prisma
├── src
│   ├── app.module.ts
│   ├── main.ts
│   ├── common
│   │   ├── decorators
│   │   ├── errors
│   │   ├── filters
│   │   ├── guards
│   │   └── utils
│   ├── config
│   ├── modules
│   │   ├── devices
│   │   ├── health
│   │   ├── storage
│   │   ├── sync
│   │   └── workspaces
│   └── prisma
│       ├── prisma.module.ts
│       └── prisma.service.ts
└── storage
    └── .gitkeep
```

## Architecture overview

### Domain model

- **Workspace** — isolated sync area.
- **Device** — authenticated client instance inside one workspace.
- **File** — logical path within a workspace.
- **Revision** — immutable file version or tombstone.
- **Event** — ordered event log for pull-based sync.

### Data storage strategy

- **PostgreSQL / Prisma** store only metadata and relationships.
- **Disk storage** stores revision bytes at `storage/{workspaceId}/{revisionId}`.
- `Revision.storageKey` points to the storage backend.
- The sync logic depends on a `StorageService` abstraction rather than direct file system APIs.

### Sync semantics

#### Push

`POST /api/sync/push`

- Validates workspace/device and payload shape.
- Normalizes paths and blocks path traversal.
- Verifies SHA-256 hash for `upsert` content.
- Processes each change independently in a serializable transaction.
- Accepts partial success: one conflict does not fail the whole batch.
- Creates `Revision` + `Event` for every accepted change.

#### Pull

`GET /api/sync/pull?workspaceId=...&deviceId=...&cursor=...`

- Returns events with `seq > cursor`.
- Orders by `seq ASC`.
- Applies configurable limit (`SYNC_PULL_LIMIT`).
- Embeds `contentBase64` for upsert revisions.
- Returns `nextCursor` for incremental polling.

## API endpoints

### Health

```http
GET /api/health
```

### Create workspace

```http
POST /api/workspaces
Content-Type: application/json

{
  "name": "My Vault"
}
```

### Register device

```http
POST /api/devices/register
Content-Type: application/json

{
  "workspaceId": "<workspace-uuid>",
  "name": "macbook-pro"
}
```

Response returns `deviceId` and plain `deviceToken`. The token is stored hashed in the database.

### Push sync changes

```http
POST /api/sync/push
Authorization: Bearer <deviceToken>
Content-Type: application/json

{
  "workspaceId": "<workspace-uuid>",
  "deviceId": "<device-uuid>",
  "changes": [
    {
      "path": "notes/test.md",
      "kind": "upsert",
      "contentBase64": "SGVsbG8=",
      "contentHash": "185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969",
      "sizeBytes": 5,
      "baseRevisionId": null
    },
    {
      "path": "notes/old.md",
      "kind": "delete",
      "baseRevisionId": "<revision-uuid>"
    }
  ]
}
```

### Pull sync changes

```http
GET /api/sync/pull?workspaceId=<workspace-uuid>&deviceId=<device-uuid>&cursor=0
Authorization: Bearer <deviceToken>
```

### Get workspace info

```http
GET /api/workspaces/:id
```

## Configuration

Copy `.env.example` to `.env` and adjust values.

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port for NestJS |
| `DATABASE_URL` | PostgreSQL connection string |
| `STORAGE_ROOT` | Root folder for revision content |
| `DEVICE_TOKEN_PEPPER` | Secret pepper used to hash device tokens |
| `SYNC_PULL_LIMIT` | Max number of pulled events |
| `SYNC_MAX_BATCH_SIZE` | Max number of changes per push |
| `SYNC_MAX_FILE_SIZE_BYTES` | Max decoded file size accepted in one change |

## Local development

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Prepare environment

```bash
cp .env.example .env
```

Set `DEVICE_TOKEN_PEPPER` before running the app.

### 4. Apply Prisma migration

```bash
npx prisma migrate deploy
npx prisma generate
```

If you want to iterate locally with new schema changes:

```bash
npx prisma migrate dev --name <migration-name>
```

### 5. Run the server

```bash
npm run start:dev
```

The API becomes available at `http://localhost:3000/api`.

## MVP implementation notes

- `rename` is intentionally modeled as `delete old path + upsert new path`.
- Conflicts are returned as business results inside push response rather than a global HTTP `409`.
- `Event.seq` uses PostgreSQL `BIGSERIAL`; the HTTP response currently serializes it as a JavaScript number for MVP simplicity.
- Disk storage is swappable because the sync module depends on `STORAGE_SERVICE` instead of a concrete FS implementation.
- Rate limiting is not enabled yet, but config/module boundaries are ready for adding it later.

## Suggested next steps after MVP

1. Add workspace membership / user auth above device auth.
2. Introduce idempotency keys for push retries.
3. Add revision streaming/download endpoint to avoid large base64 pull payloads.
4. Replace disk storage with S3/MinIO implementation behind the same interface.
5. Add observability: structured logs, metrics, tracing, audit events.
6. Add automated integration tests with Testcontainers or docker-compose driven CI.
7. Add per-workspace quotas and rate limiting.
8. Add tombstone retention and storage garbage collection strategy.
