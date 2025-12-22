# CAPS360 Deployment Guide

## Prerequisites

- Fly.io account
- Supabase account and project
- `flyctl` installed and logged in
- Node.js 18+ and npm
- Docker installed

## Supabase Setup

1. **Create a Supabase Project**:
   - Create a new project in the Supabase Dashboard.
   - Note down the `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

2. **Database Schema**:
   - Use the Supabase SQL Editor to run your migration scripts or `schema.sql`.

3. **Storage Buckets**:
   - Create a bucket named `content` in Supabase Storage.
   - Set up appropriate policies for access (public or private as needed).

## Fly.io Deployment

### 1. Backend Deployment

```bash
cd backend

# Launch app (first time only)
# fly launch --no-deploy

# Set secrets
fly secrets set \
  NODE_ENV=production \
  JWT_SECRET=your-secret \
  SUPABASE_URL=your-url \
  SUPABASE_ANON_KEY=your-key \
  GEMINI_API_KEY=your-gemini-key \
  PAYSTACK_SECRET_KEY=your-paystack-key

# Deploy
fly deploy --config ../fly-backend.toml
```

### 2. Frontend Web Deployment

```bash
cd frontend-web

# Build the frontend
npm run build

# Deploy to Fly.io (assuming nginx setup)
fly deploy --config ../fly-frontend.toml
```

## GitHub Actions Deployment

Once the GitHub repository and Fly.io apps are linked, deployments happen automatically:

- **Backend**: Triggered on push to `main` if `backend/**` or `fly-backend.toml` changes.
- **Frontend**: Triggered on push to `main` if `frontend-web/**` or `fly-frontend.toml` changes.

Required GitHub Secrets:

- `FLY_API_TOKEN`: Your Fly.io access token.
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_ANON_KEY`: Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key.

## Post-Deployment Configuration

1. **Update Frontend Environment Variables**:
   - Ensure `VITE_API_URL` points to your backend Fly.io URL.
   - Set up `VITE_PAYSTACK_PUBLIC_KEY` in the frontend environment.

2. **Configure Webhook URLs**:
   - Update PayFast and Paystack webhook URLs to point to your backend API:
     - `https://your-backend-fly-app.fly.dev/api/payments/webhooks/payfast`
     - `https://your-backend-fly-app.fly.dev/api/payments/webhooks/paystack`

## Monitoring & Operations

### Logs

- Use `fly logs -a <app-name>` to view real-time logs.

### Scaling

- Use `fly scale count <number>` to change instance count.

### Backups

- Supabase handles PostgreSQL backups automatically based on your plan.
- For files, enable versioning or use replication if critical.

## Security Checklist

- [ ] All secrets stored in Fly.io Secrets
- [ ] CORS configured for frontend domains only
- [ ] Rate limiting enabled on API
- [ ] Webhook signature verification implemented
- [ ] HTTPS enforced on all endpoints
- [ ] Regular security audits scheduled
- [ ] Supabase RLS policies configured
