# BK Academy Frontend

React + Vite portal foundation for BK Academy Re-imagined.

## Quick Start

1. Copy `.env.example` to `.env`.
2. Confirm the backend API URL:

```env
VITE_API_URL=http://localhost:4000/api/v1
```

3. Install dependencies:

```bash
npm install
```

4. Start the frontend:

```bash
npm run dev
```

The app runs on `http://localhost:5173`.

## Verification

```bash
npm run typecheck
npm run build
```

## Railway Deployment

This frontend is Railway-ready through the included `Dockerfile`, `Caddyfile`, and `railway.json`.

### Deploy From GitHub

1. Push the repository to GitHub.
2. In Railway, create a new project and select `Deploy from GitHub repo`.
3. Select this repository.
4. Set the service root directory to:

```text
frontend
```

5. Add this Railway service variable before deploying:

```env
VITE_API_URL=https://your-backend-domain/api/v1
```

6. Deploy the service.
7. In the Railway service `Networking` tab, click `Generate Domain`.

### Deploy From Railway CLI

Run these commands from the frontend directory:

```bash
cd "/Users/pmutabazi/Documents/New project/frontend"
railway login
railway init
railway variables --set "VITE_API_URL=https://your-backend-domain/api/v1"
railway up
```

`VITE_API_URL` is a build-time variable for Vite, so set it before deployment. If the backend domain changes, update the variable and redeploy.

## Current Portal Scope

- BK-branded public landing page.
- Applicant registration and application submission flow.
- Login with stored bearer token session.
- Student dashboard foundation using `GET /api/v1/student/dashboard`.
- Admin dashboard foundation using analytics and application review APIs.
- Executive dashboard foundation using analytics and reporting APIs.
- Report CSV smoke action for application exports.

This is the first frontend foundation slice. It intentionally keeps routing and state lightweight until the final screen map and UX details are confirmed.
