# AgenticDT Backend Proxy

A secure Node.js/Express server that proxies authenticated requests to OpenAI GPT-4o while keeping API keys server-side only.

## Overview

This backend:
- **Validates Firebase ID tokens** before allowing requests
- **Proxies chat requests** to OpenAI GPT-4o
- **Never exposes OpenAI keys** to any client
- **Enforces CORS** for trusted origins only
- **Uses Helmet** for security headers

## Prerequisites

- **Node.js** >= 18.0.0
- **Firebase project** with Authentication enabled
- **OpenAI API key** (sk-...)
- **Firebase service account** credentials (JSON keyfile)

## Setup

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

#### Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Settings (gear icon) → Service Accounts
3. Click "Generate new private key" → Download JSON
4. Copy values to `.env`:
   - `FIREBASE_PROJECT_ID`: from JSON `project_id`
   - `FIREBASE_CLIENT_EMAIL`: from JSON `client_email`
   - `FIREBASE_PRIVATE_KEY`: from JSON `private_key` (include BEGIN/END markers)

#### OpenAI Key
- Get from [OpenAI API keys page](https://platform.openai.com/api-keys)
- Add to `OPENAI_API_KEY` in `.env`

#### CORS Origins
- Update `ALLOWED_ORIGINS` with your frontend URL(s), comma-separated

### 3. Run

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server listens on `http://localhost:3001` (or `$PORT`).

## API Endpoints

### `GET /health`
Health check. No authentication required.

```bash
curl http://localhost:3001/health
```

Response:
```json
{ "status": "ok", "timestamp": "2026-03-11T10:00:00.000Z" }
```

### `POST /api/chat`
Send messages to GPT-4o. **Requires Firebase ID token.**

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -d '{
    "messages": [{ "role": "user", "content": "Hello!" }],
    "systemPrompt": "You are a helpful assistant."
  }'
```

**Request body:**
- `messages` (array, required): Chat message objects with `role` ("user"/"assistant") and `content`
- `systemPrompt` (string, optional): System prompt for the conversation

**Response:**
```json
{
  "reply": "Hello! How can I help you today?",
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 10,
    "total_tokens": 25
  }
}
```

## Deployment

### Vercel
```bash
vercel deploy
```
Add environment variables in Vercel dashboard.

### Railway
```bash
railway up
```
Set environment variables via Railway dashboard.

### Render
1. Connect your repo on [render.com](https://render.com)
2. Create Web Service
3. Add environment variables
4. Deploy

### Firebase Cloud Functions
See [Deploy on Firebase Cloud Functions](https://firebase.google.com/docs/hosting/functions).

## Security

- **Firebase ID token validation**: All `/api/*` endpoints verify tokens server-side
- **CORS policy**: Only trusted origins defined in `ALLOWED_ORIGINS` can call the API
- **Helmet**: Adds security headers (CSP, X-Frame-Options, etc.)
- **No API key exposure**: OpenAI key never sent to clients
- **Request size limit**: Capped at 2MB to prevent abuse

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase private key (with newlines) |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | Model name (default: `gpt-4o`) |
| `PORT` | No | Server port (default: `3001`) |
| `ALLOWED_ORIGINS` | No | CORS origins, comma-separated (default: `http://localhost:5173`) |

## Troubleshooting

**"Invalid or expired token"**
- Ensure the client is sending a valid Firebase ID token in the `Authorization` header
- Check token expiration (ID tokens expire after 1 hour)

**"OpenAI request failed"**
- Verify `OPENAI_API_KEY` is correct
- Check OpenAI API quota and billing status
- Review OpenAI error logs

**CORS errors**
- Verify frontend URL is in `ALLOWED_ORIGINS`
- Check that frontend is sending correct headers

**Firebase initialization error**
- Verify `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` are correct
- Ensure newlines in private key are properly escaped
