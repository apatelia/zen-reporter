# Testing Guide: Local (SQLite & Disk) vs Remote (PostgreSQL & Multi-Cloud Object Storage)

This step-by-step guide explains how to configure, switch between, and verify Zen Reporter's operational setups:

1. **Local Mode**: Uses local SQLite (`history.db`) for run metadata and local filesystem (`attachments/`) for media artifacts.
2. **Remote Mode**: Uses the backend ingestion service (`@arpanp/zen-server`), PostgreSQL for relational run data, and pluggable cloud object storage (**AWS S3**, **Google Cloud Storage**, or **Azure Blob Storage**) via presigned URLs for media artifacts.

---

## 🧭 Setup Comparison Overview

| Feature                | Local Mode (`mode: 'local'`)                     | Remote Mode (`mode: 'remote'`)                                                     |
| :--------------------- | :----------------------------------------------- | :--------------------------------------------------------------------------------- |
| **History Database**   | SQLite file at `./zen-report/history.db`         | PostgreSQL database `zen_reporter`                                                 |
| **Binary Attachments** | Files copied to `./zen-report/attachments/`      | Uploaded via presigned URLs to AWS S3, Google Cloud Storage, or Azure Blob Storage |
| **Serving Reports**    | Embedded in static `index.html` or `npx zr show` | API server (`packages/server`) on `http://localhost:3000`                          |
| **Best For**           | Local single-developer workflows & CI artifacts  | Shared team dashboards, multi-tenant SaaS, cross-run CI                            |

---

## 🛠️ Prerequisites for Remote Testing

Ensure your local PostgreSQL container is running:

```bash
# Check running containers
podman ps   # or docker ps
```

You should see:

- `zen-postgres` on port `5432`

---

## 1️⃣ Testing Local Setup (SQLite + Local Disk)

### Step 1: Configure `playwright.config.ts`

Set `history` to `true` or explicitly configure `mode: 'local'`:

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        outputDir: 'zen-report',
        testRunName: 'Local SQLite Run #{N}',
        history: {
          mode: 'local',
          maxRuns: 50,
        },
      },
    ],
  ],
});
```

### Step 2: Execute Playwright Tests

Run any test suite with attachments (e.g., visual regression or attachment tests):

```bash
npx playwright test tests/attachments.spec.ts
```

### Step 3: Verify Local Artifacts

Check that the files were written directly to your local report directory:

```bash
# 1. Verify SQLite database exists and contains runs
sqlite3 zen-report/history.db "SELECT run_id, run_name, run_total, run_passed FROM history_runs;"

# 2. Verify local attachments folder contains images/videos
ls -la zen-report/attachments/
```

### Step 4: Inspect in the Browser

Serve the local report using the CLI:

```bash
npx zr show zen-report
```

- Open the dashboard at `http://localhost:9323`.
- Click **"Switch Run"** in the top bar to verify your past runs recorded in `history.db`.
- Expand a test card to verify screenshots load from `./attachments/`.

---

## 2️⃣ Testing Remote Setup with Cloud Providers

The backend service (`@arpanp/zen-server`) uses the `STORAGE_PROVIDER` environment variable to switch cloud storage targets:

- `STORAGE_PROVIDER=s3` (AWS S3, MinIO, S3Mock, Cloudflare R2, Wasabi)
- `STORAGE_PROVIDER=gcp` (Google Cloud Storage)
- `STORAGE_PROVIDER=azure` (Microsoft Azure Blob Storage)

---

### Option A: Testing with AWS S3 (or Local S3Mock / MinIO)

#### 1. Start Local S3Mock (if not using real AWS)

```bash
podman run -d --name zen-s3 -p 9090:9090 -p 9191:9191 adobe/s3mock:latest
```

#### 2. Configure Environment & Start Server

Set provider to `s3` (the default) and pass your AWS or mock credentials:

```bash
# packages/server/.env or inline:
export STORAGE_PROVIDER=s3
export S3_BUCKET=zen-reports
export S3_ENDPOINT=http://localhost:9090
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=mock_access_key
export AWS_SECRET_ACCESS_KEY=mock_secret_key

npm run dev -w @arpanp/zen-server
```

#### 3. Execute Tests Against Remote

```bash
ZEN_REMOTE=true npx playwright test tests/attachments.spec.ts
```

#### 4. Verify S3 Ingestion

- **Postgres**:

  ```bash
  podman exec -i zen-postgres psql -U postgres -d zen_reporter -c \
    "SELECT id, run_name, run_total, run_passed FROM runs ORDER BY started_at DESC LIMIT 1;"
  ```

- **S3 Bucket Objects**:

  ```bash
  curl -s http://localhost:9090/zen-reports | grep -o '<Key>[^<]*</Key>'
  ```

---

### Option B: Testing with Google Cloud Storage (GCP)

#### 1. Setup GCP Credentials & Bucket

1. Create a service account in GCP with `Storage Object Admin` permissions.
2. Download the JSON key file (e.g. `gcp-key.json`).
3. Set your target GCS bucket name (e.g. `my-zen-reports-bucket`).

> **Tip (GCS Signed URLs)**: Ensure the service account has the **Service Account Token Creator** role (`roles/iam.serviceAccountTokenCreator`) on itself if generating V4 signed URLs using IAM credentials.

#### 2. Configure Environment & Start Server for GCP

```bash
export STORAGE_PROVIDER=gcp
export GCS_BUCKET=my-zen-reports-bucket
export GCP_PROJECT_ID=my-gcp-project-id
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcp-key.json

npm run dev -w @arpanp/zen-server
```

#### 3. Execute Tests Against Remote for GCP

```bash
ZEN_REMOTE=true npx playwright test tests/attachments.spec.ts
```

#### 4. Verify GCS Ingestion

- Check uploaded objects in your GCP bucket:

  ```bash
  gcloud storage ls --recursive gs://my-zen-reports-bucket/
  ```

- Expand test cases in the UI (`npm run dev`) and inspect network requests to verify attachments load directly from `https://storage.googleapis.com/...`.

---

### Option C: Testing with Microsoft Azure Blob Storage

#### 1. Setup Azure Storage Account & Container

1. Create a Storage Account in the Azure Portal (or run Azure Azurite emulator for local testing: `podman run -d -p 10000:10000 mcr.microsoft.com/azure-storage/azurite`).
2. Create or name a container (e.g. `zen-reports`).
3. Retrieve your Storage Account Name and Access Key (or Connection String).

#### 2. Configure Environment & Start Server for Azure

```bash
export STORAGE_PROVIDER=azure
export AZURE_STORAGE_CONTAINER=zen-reports
export AZURE_STORAGE_ACCOUNT_NAME=my_azure_account
export AZURE_STORAGE_ACCOUNT_KEY=my_base64_account_key==
# Or alternatively use a connection string:
# export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"

npm run dev -w @arpanp/zen-server
```

#### 3. Execute Tests Against Remote for Azure

```bash
ZEN_REMOTE=true npx playwright test tests/attachments.spec.ts
```

#### 4. Verify Azure Ingestion

- View uploaded blobs using the Azure CLI:

  ```bash
  az storage blob list --container-name zen-reports --account-name my_azure_account --output table
  ```

- Expand test cases in the UI (`npm run dev`) and inspect network requests to verify attachments load from `https://<account>.blob.core.windows.net/...`.

---

## 3️⃣ Verifying Lazy Loading in the UI

In remote mode, test cards only load basic metadata initially. Heavy data (steps, stack traces, and console logs) is fetched on demand:

1. Make sure `packages/server` is running on `http://localhost:3000`.
2. Start the UI development server:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.
4. Click on a test case to expand it:
   - Notice the expand button shows a brief loading spinner.
   - Open your browser's **Network tab** (F12 > Network) and filter by `Fetch/XHR`.
   - Observe the request:

     ```http
     GET /api/v1/runs/<runId>/tests/<testId>
     ```

   - The response returns `details` (`stepsJson`, `stdoutJson`, `errorStack`) and signed attachment URLs pointing directly to your active cloud provider (S3, GCS, or Azure).

---

## 🔄 Dynamic Switching in `playwright.config.ts`

You can configure [`playwright.config.ts`](file:///home/arpan/CodePlay/zen-reporter/playwright.config.ts) to switch dynamically based on environment variables:

```ts
import { defineConfig } from '@playwright/test';

const isRemote = Boolean(process.env.ZEN_REMOTE);

export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        outputDir: 'zen-report',
        testRunName: isRemote ? 'Cloud CI Run #{N}' : 'Local Dev Run #{N}',
        history: isRemote
          ? {
              mode: 'remote',
              serverUrl: process.env.ZEN_SERVER_URL || 'http://localhost:3000',
              apiKey: process.env.ZEN_API_KEY || 'zr_live_dev_api_key_12345',
            }
          : {
              mode: 'local',
            },
      },
    ],
  ],
});
```
