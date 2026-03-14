# AgenticDT — Deployment Guide

Deploy the backend to **Railway** (persistent Node.js server with AWS keys) and the
frontend to **Vercel** (static React app).  AWS keys never leave the Railway server.

---

## Architecture Overview

```
Browser / iOS app
      │
      │  HTTPS
      ▼
 ┌─────────────┐
 │   Vercel    │   (static React build — no secrets)
 │  (React UI) │
 └──────┬──────┘
        │  HTTPS /api/*
        ▼
 ┌─────────────┐       AWS SDK (server-side only)
 │   Railway   │ ──────────────────────────────────► AWS Glue / Step Functions / S3
 │  (Node.js)  │
 └─────────────┘
   ↑ holds ALL secrets (AWS keys, OpenAI key, passcode)
```

---

## Part 1 — Deploy the Backend to Railway

### 1.1 Create the Railway project

1. Go to [railway.app](https://railway.app) and sign in (GitHub login recommended).
2. Click **New Project → Deploy from GitHub repo**.
3. Select your repository.  When prompted for the **Root Directory**, enter:
   ```
   backend
   ```
4. Railway detects `package.json` and runs `npm install` automatically.
   The `railway.toml` in `backend/` configures the start command (`node index.js`)
   and health check path (`/health`).

### 1.2 Set environment variables in Railway

In the Railway dashboard → your service → **Variables**, add every key below.
**Never commit these values to Git.**

| Variable | Value | Notes |
|---|---|---|
| `PORT` | `3001` | Railway overrides this; include as fallback |
| `NODE_ENV` | `production` | |
| `AWS_ACCESS_KEY_ID` | `AKIA…` | IAM user with Glue + SFN + S3 permissions |
| `AWS_SECRET_ACCESS_KEY` | `…` | |
| `AWS_REGION` | `us-east-1` | Must match the region where setup.sh was run |
| `PIPELINE_S3_BUCKET` | `your-bucket-name` | The S3 bucket from setup.sh |
| `PIPELINE_SFN_ARN` | `arn:aws:states:…` | Step Functions state machine ARN |
| `OPENAI_API_KEY` | `sk-…` | For AI chat + metadata enrichment |
| `OPENAI_MODEL` | `gpt-4o` | Optional — defaults to `gpt-4o` |
| `PIPELINE_PASSCODE` | `1234` | **4-digit passcode** anyone must enter to trigger a pipeline run |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Set this after Vercel deploy (comma-separated if multiple) |

> **Optional**: add `AWS_SESSION_TOKEN` if using short-lived credentials.

### 1.3 Get your Railway backend URL

After the first successful deploy, Railway gives you a URL like:

```
https://agenticdt-backend-production.up.railway.app
```

Copy it — you need it for the Vercel step.

### 1.4 Verify the backend is live

```bash
curl https://agenticdt-backend-production.up.railway.app/health
```

Expected:
```json
{ "status": "ok", "aws": true, "openai": true, "awsRegion": "us-east-1" }
```

---

## Part 2 — Deploy the Frontend to Vercel

### 2.1 Import the project

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New → Project → Import Git Repository**.
3. Select your repo.
4. Under **Framework Preset**, choose **Vite**.
5. Set **Root Directory** to:
   ```
   web/agenticdt-web
   ```
6. Leave **Build Command** as `npm run build` and **Output Directory** as `dist`.

### 2.2 Set environment variables in Vercel

In the Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `VITE_BACKEND_URL` | `https://agenticdt-backend-production.up.railway.app` |

This is the **only** secret the frontend needs.  All AWS/OpenAI keys stay on Railway.

### 2.3 Deploy

Click **Deploy**.  Vercel builds the Vite app and publishes it.  Your app URL
will be something like `https://agenticdt-web.vercel.app`.

The `vercel.json` in `web/agenticdt-web/` handles SPA routing — all paths
(e.g. `/catalog`, `/pipeline`) redirect to `index.html` so React Router works.

### 2.4 Update ALLOWED_ORIGINS on Railway

Go back to Railway → Variables and set:

```
ALLOWED_ORIGINS=https://agenticdt-web.vercel.app
```

Multiple origins (e.g. custom domain too):

```
ALLOWED_ORIGINS=https://agenticdt-web.vercel.app,https://yourdomain.com
```

Railway restarts the service automatically.

---

## Part 3 — Push the Updated Step Functions Definition

After any change to `backend/aws/step-functions.json`, push it to AWS:

```bash
# Run from the backend/aws/ directory
SFN_ARN="arn:aws:states:us-east-1:YOUR_ACCOUNT_ID:stateMachine:agenticdt-pipeline"
REGION="us-east-1"

aws stepfunctions update-state-machine \
  --state-machine-arn "$SFN_ARN" \
  --definition "file://step-functions.json" \
  --region "$REGION"
```

The current definition supports two modes:
- **Full Pipeline** (`skip_etl: false`) → Glue ETL → Quality Profiler → Done
- **Quality Only** (`skip_etl: true`) → Quality Profiler only, reuses last ETL output

---

## Part 4 — Passcode Flow (how it works end-to-end)

1. Visitor clicks **Run Pipeline** or **Run Quality Check**.
2. The frontend shows a **4-digit passcode modal**.
3. The user enters the code.  The frontend verifies it against `GET /api/ingest/config`
   using the `x-pipeline-passcode` header — before triggering anything.
4. If correct, the code is stored in React state for the session.  All subsequent
   pipeline calls include `x-pipeline-passcode` automatically.
5. If wrong, the modal shows an error and asks the user to retry.
6. The backend `requirePasscode` middleware rejects any pipeline trigger without
   the correct code, returning `403 Incorrect passcode`.

**To change the passcode**: update `PIPELINE_PASSCODE` in Railway → redeploy.

---

## Part 5 — Local Development (recap)

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env          # fill in your values
npm install
node index.js                  # runs on :3001

# Terminal 2 — frontend
cd web/agenticdt-web
npm install
npm run dev                    # runs on :5173
```

No `VITE_BACKEND_URL` needed locally — `vite.config.js` proxies all `/api` calls
to `http://localhost:3001` automatically via the dev server proxy.

---

## Part 6 — Custom Domain (optional)

**Vercel**: Project → Settings → Domains → Add domain.  Follow the DNS
CNAME instructions.  Then add the new domain to `ALLOWED_ORIGINS` in Railway.

**Railway**: Service → Settings → Networking → Custom Domain.

---

## Environment Variable Quick Reference

### Railway (backend — all secrets live here)

```env
PORT=3001
NODE_ENV=production
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
PIPELINE_S3_BUCKET=agenticdt-bucket
PIPELINE_SFN_ARN=arn:aws:states:us-east-1:123456789012:stateMachine:agenticdt-pipeline
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o
PIPELINE_PASSCODE=1234
ALLOWED_ORIGINS=https://agenticdt-web.vercel.app
```

### Vercel (frontend — only one var needed)

```env
VITE_BACKEND_URL=https://agenticdt-backend-production.up.railway.app
```

---

## Troubleshooting

**CORS errors in browser console**
→ `ALLOWED_ORIGINS` on Railway must exactly match your Vercel URL — no trailing slash.

**Pipeline starts but Glue job fails immediately**
→ Verify `PIPELINE_SFN_ARN` and `AWS_REGION` match the region where setup.sh ran.
→ Push the latest SFN definition to AWS (Part 3 above).

**"Passcode required" 401 even with correct code entered**
→ Confirm the request header is `x-pipeline-passcode` (lowercase).
→ CORS `allowedHeaders` in `index.js` already includes it — check Railway redeployed.

**Railway deploy fails with "Cannot find module"**
→ Confirm **Root Directory** in Railway is `backend`, not the repo root.

**Vercel build fails**
→ Confirm **Root Directory** in Vercel is `web/agenticdt-web` and Framework is **Vite**.

**Chat responds with "0 rows / 0 columns" after pipeline**
→ The pyarrow Lambda layer must be built for Amazon Linux x86_64, not macOS.
→ Re-run `setup.sh` step 6 (Lambda packaging) — the fix (`--platform manylinux2014_x86_64`)
  is already in the script.

**Quality step stays yellow after re-run**
→ The profiler failed or timed out.  Check CloudWatch Logs for the Lambda function
  `agenticdt-quality-profiler` and verify pyarrow is correctly bundled (above).
