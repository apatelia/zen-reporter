# Backend API Server (`@arpanp/zen-server`)

The Zen Reporter backend server (`packages/server`) provides a multi-tenant ingestion, reporting, and asset management service for cross-run history persistence in CI/CD pipelines and hosted team dashboards.

---

## 🏗️ Architecture & Tech Stack

- **HTTP Framework**: [Hono](https://hono.dev/) with `@hono/node-server`
- **Database & ORM**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Multi-Cloud Object Storage**: Pluggable blob storage supporting:
  - **AWS S3** / S3-compatible providers (Cloudflare R2, MinIO, Adobe S3Mock, Wasabi)
  - **Google Cloud Storage (GCS)** via `@google-cloud/storage`
  - **Microsoft Azure Blob Storage** via `@azure/storage-blob`
- **Authentication**: Multi-tenant API Keys with SHA-256 key hashing

```mermaid
flowchart LR
    subgraph Clients["Clients"]
        A["Playwright Runner (RemoteHistoryStore)"]
        B["Browser Dashboard (UI)"]
    end

    subgraph Server["packages/server (Hono)"]
        C["Auth Middleware"]
        D["Ingestion & Run Routes"]
        E["Storage Service (S3 / GCS / Azure Provider)"]
    end

    subgraph Storage["Infrastructure"]
        F[("PostgreSQL")]
        G[("Object Storage Bucket / Container")]
    end

    A -- "POST /api/v1/runs" --> C
    A -- "POST /attachments/presign" --> C
    B -- "GET /api/v1/runs/:runId/tests/:testId" --> C
    C --> D
    D --> F
    D --> E
    E -- Presigned URLs / SAS --> G
    A -- Direct PUT (traces/screenshots) --> G
```

---

## ⚙️ Environment Variables & Configuration

The server reads configuration from environment variables or standard defaults:

### Common Settings

| Variable           | Description                                 | Default                                                      |
| :----------------- | :------------------------------------------ | :----------------------------------------------------------- |
| `PORT`             | HTTP port the server listens on             | `3000`                                                       |
| `DATABASE_URL`     | PostgreSQL connection string                | `postgresql://postgres:postgres@localhost:5432/zen_reporter` |
| `STORAGE_PROVIDER` | Cloud storage driver (`s3`, `gcp`, `azure`) | `s3`                                                         |

### AWS S3 / S3-Compatible Settings (`STORAGE_PROVIDER=s3`)

| Variable                | Description                               | Default                 |
| :---------------------- | :---------------------------------------- | :---------------------- |
| `S3_ENDPOINT`           | Endpoint for S3-compatible object storage | `http://localhost:9090` |
| `S3_BUCKET`             | S3 bucket name for test attachments       | `zen-reports`           |
| `AWS_REGION`            | AWS region                                | `us-east-1`             |
| `AWS_ACCESS_KEY_ID`     | Storage access key                        | `mock_access_key`       |
| `AWS_SECRET_ACCESS_KEY` | Storage secret access key                 | `mock_secret_key`       |

### Google Cloud Storage Settings (`STORAGE_PROVIDER=gcp`)

| Variable                         | Description                       | Default                                           |
| :------------------------------- | :-------------------------------- | :------------------------------------------------ |
| `GCS_BUCKET`                     | GCS bucket name                   | `zen-reports`                                     |
| `GCP_PROJECT_ID`                 | Google Cloud project ID           | _Optional if defined in service account_          |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON file | _Uses Application Default Credentials if omitted_ |

### Azure Blob Storage Settings (`STORAGE_PROVIDER=azure`)

| Variable                          | Description                  | Default                                    |
| :-------------------------------- | :--------------------------- | :----------------------------------------- |
| `AZURE_STORAGE_CONTAINER`         | Azure Blob container name    | `zen-reports`                              |
| `AZURE_STORAGE_ACCOUNT_NAME`      | Storage account name         | `mock_account`                             |
| `AZURE_STORAGE_ACCOUNT_KEY`       | Storage account base64 key   |                                            |
| `AZURE_STORAGE_CONNECTION_STRING` | Full Azure connection string | _Optional alternative to account name/key_ |

---

## 🚀 Running the Server

### 1. Database Migrations

Apply database schemas and migrations via Drizzle Kit:

```bash
cd packages/server
npx drizzle-kit migrate
```

### 2. Development Mode

Start the server with live file watching via `tsx`:

```bash
npm run dev -w @arpanp/zen-server
# or from root
npx tsx packages/server/src/index.ts
```

### 3. Production Build & Start

```bash
npm run build -w @arpanp/zen-server
node packages/server/dist/index.js
```

Upon startup, the server automatically bootstraps a default development tenant:

- **Tenant ID**: `default-tenant`
- **Development API Key**: `zr_live_dev_api_key_12345`
- **S3 Bucket**: Initializes bucket `zen-reports` if not already present.

---

## 🔐 Authentication

All routes under `/api/v1/` require an API key passed in either of the following headers:

- `Authorization: Bearer <API_KEY>`
- `X-API-Key: <API_KEY>`

Requests with missing or invalid keys return `401 Unauthorized` or `403 Forbidden`. The tenant context is automatically derived from the API key.

---

## 📡 REST API Reference

### 1. Health Check

#### `GET /health`

Public health status check. Does not require authentication.

**Response (`200 OK`)**:

```json
{
  "status": "ok",
  "timestamp": "2026-11-04T16:46:01.715Z"
}
```

---

### 2. Ingestion & Runs

#### `POST /api/v1/runs`

Ingests a completed test execution run, test cases, and attachment records.

> [!NOTE]
> Test case IDs are structured as `${runId}::${project || 'default'}::${file}::${title}`. Attachments include the `project` identifier alongside `file` and `title` to uniquely link to multi-browser/multi-project Playwright runs without collision.

**Headers**:

- `Authorization: Bearer <API_KEY>`
- `Content-Type: application/json`

**Request Body**:

```json
{
  "runId": "2026-11-04T17-00-00__unit-tests",
  "runName": "Unit Tests Run #1",
  "projectName": "Core API",
  "startedAt": "2026-11-04T17:00:00.000Z",
  "endedAt": "2026-11-04T17:01:30.000Z",
  "runDurationMs": 90000,
  "runSequentialDurationMs": 115000,
  "runTotal": 10,
  "runPassed": 9,
  "runFailed": 1,
  "runSkipped": 0,
  "runTimedOut": 0,
  "runInterrupted": 0,
  "runWorkers": 4,
  "runProjects": 1,
  "stepAssertions": 42,
  "stepActions": 18,
  "gitBranch": "main",
  "gitCommit": "a1b2c3d",
  "gitCommitFull": "a1b2c3d4e5f678901234567890abcdef12345678",
  "testCases": [
    {
      "id": "2026-11-04T17-00-00__unit-tests::chromium::auth.spec.ts::user can log in",
      "file": "auth.spec.ts",
      "suite": "Authentication Suite",
      "title": "user can log in",
      "project": "chromium",
      "status": "passed",
      "durationMs": 1250,
      "attempts": 1,
      "failedAttempts": 0,
      "passedOnRetry": 0,
      "tags": ["smoke", "auth"],
      "stepsJson": [{ "title": "navigate to /login", "duration": 300 }],
      "stdoutJson": ["Redirected to dashboard"]
    }
  ],
  "attachments": [
    {
      "file": "auth.spec.ts",
      "title": "user can log in",
      "project": "chromium",
      "status": "passed",
      "name": "login-success.png",
      "contentType": "image/png",
      "s3Key": "default-tenant/2026-11-04T17-00-00__unit-tests/1234-login-success.png",
      "sizeBytes": 54200
    }
  ]
}
```

**Response (`201 Created`)**:

```json
{
  "success": true,
  "runId": "2026-11-04T17-00-00__unit-tests"
}
```

---

#### `GET /api/v1/runs`

Returns a paginated list of test runs belonging to the tenant.

**Query Parameters**:

- `page` (number, default: `1`)
- `limit` (number, default: `20`, max: `100`)

**Response (`200 OK`)**:

```json
{
  "data": [
    {
      "id": "2026-11-04T17-00-00__unit-tests",
      "tenantId": "default-tenant",
      "runName": "Unit Tests Run #1",
      "projectName": "Core API",
      "startedAt": "2026-11-04T17:00:00.000Z",
      "endedAt": "2026-11-04T17:01:30.000Z",
      "runDurationMs": 90000,
      "runTotal": 10,
      "runPassed": 9,
      "runFailed": 1,
      "runSkipped": 0,
      "gitBranch": "main",
      "gitCommit": "a1b2c3d"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### `GET /api/v1/runs/:runId`

Retrieves run summary metrics, lightweight test cases, and attachment records for a specific run.

**Response (`200 OK`)**:

```json
{
  "run": { ... },
  "testCases": [
    {
      "id": "2026-11-04T17-00-00__unit-tests::auth.spec.ts::user can log in",
      "file": "auth.spec.ts",
      "title": "user can log in",
      "status": "passed",
      "durationMs": 1250
    }
  ],
  "attachments": [ ... ]
}
```

---

### 3. Lazy-Loaded Test Details

#### `GET /api/v1/runs/:runId/tests/:testId`

Fetches heavy execution details (detailed steps, console stdout/stderr, stack traces, and presigned attachment URLs) for a single test case.

**Response (`200 OK`)**:

```json
{
  "id": "2026-11-04T17-00-00__unit-tests::auth.spec.ts::user can log in",
  "runId": "2026-11-04T17-00-00__unit-tests",
  "file": "auth.spec.ts",
  "title": "user can log in",
  "status": "passed",
  "durationMs": 1250,
  "details": {
    "testId": "2026-11-04T17-00-00__unit-tests::auth.spec.ts::user can log in",
    "errorStack": null,
    "stepsJson": [{ "title": "navigate to /login", "duration": 300 }],
    "stdoutJson": ["Redirected to dashboard"],
    "stderrJson": null
  },
  "attachments": [
    {
      "name": "login-success.png",
      "contentType": "image/png",
      "s3Key": "default-tenant/2026-11-04T17-00-00__unit-tests/1234-login-success.png",
      "url": "http://localhost:9090/zen-reports/default-tenant/..."
    }
  ]
}
```

---

### 4. Presigned Attachment Uploads (Multi-Cloud)

#### `POST /api/v1/runs/:runId/attachments/presign`

Requests a short-lived presigned PUT URL (or Azure SAS URL) allowing clients to upload binary attachments directly to S3, Google Cloud Storage, or Azure Blob Storage without routing massive file payloads through the API application server.

**Request Body**:

```json
{
  "fileName": "trace.zip",
  "contentType": "application/zip"
}
```

**Response (`200 OK`)**:

```json
{
  "uploadUrl": "http://localhost:9090/zen-reports/default-tenant/2026-11-04T17-00-00__unit-tests/1793810797701-trace.zip?X-Amz-...",
  "headers": {},
  "s3Key": "default-tenant/2026-11-04T17-00-00__unit-tests/1793810797701-trace.zip",
  "storageKey": "default-tenant/2026-11-04T17-00-00__unit-tests/1793810797701-trace.zip",
  "bucket": "zen-reports"
}
```

_(Note: For Azure Blob Storage, `headers` will include `{"x-ms-blob-type": "BlockBlob"}` which `RemoteHistoryStore` automatically transmits)._

The client then executes a direct HTTP PUT:

```bash
curl -X PUT -T trace.zip -H "Content-Type: application/zip" "$uploadUrl"
```
