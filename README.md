# CAPS360 - AI-Powered Educational Platform

![CAPS360 Logo](./docs/assets/logo.png)

[![CI](https://github.com/YOUR_USERNAME/CAPS360/workflows/CI%20-%20Tests%20and%20Linting/badge.svg)](https://github.com/YOUR_USERNAME/CAPS360/actions)
[![Deploy](https://github.com/YOUR_USERNAME/CAPS360/workflows/Deploy%20to%20Fly.io/badge.svg)](https://github.com/YOUR_USERNAME/CAPS360/actions)
[![Security](https://github.com/YOUR_USERNAME/CAPS360/workflows/Security%20Scanning/badge.svg)](https://github.com/YOUR_USERNAME/CAPS360/actions)

## Overview

CAPS360 is a comprehensive South African educational platform designed to support students, teachers, and parents with AI-powered learning tools aligned with the CAPS (Curriculum and Assessment Policy Statement) curriculum.

## Features

### 🎓 Multi-Tier Subscription System

- **Study Help** (R39/month) - Basic quiz access and limited AI assistance
- **Standard CAPS360** (R99/month) - Full AI tutor, unlimited quizzes, video lessons
- **Premium CAPS360** (R149/month) - Everything + Teacher portal + Parent dashboard + Curriculum planning

### 🎁 Trial & Welcome Premium

- **14-day Free Trial** - Full Premium access, payment after trial ends
- **Welcome Premium** - Immediate payment gets 14 days of Premium features before reverting to purchased tier

### 🤖 AI-Powered Features

- **AI Tutor Chat** - Context-aware Q&A with conversation history
- **Quiz Generator** - CAPS-aligned quizzes from lesson content
- **Marking Assistant** - Automated grading with detailed feedback
- **Curriculum Planner** - Lesson planning for teachers (Premium only)

### 📚 Content Management

- Video lessons organized by grade and subject
- PDF study materials and worksheets
- Assignment submission and tracking
- Progress analytics for students and parents

### 💳 Payment Integration

- **PayFast** - Trial payment capture and one-time payments
- **Paystack** - Recurring monthly/annual subscriptions

## Tech Stack

### Backend

- **Runtime:** Node.js + Express + TypeScript
- **Payments**: Paystack (ZAR)
- **Hosting:** Fly.io (or generic Docker hosting)
- **AI:** Google Gemini (via API)

### Frontend

- **Web:** React + Vite + TypeScript + TailwindCSS
- **Mobile:** React Native + Expo
- **State Management:** Zustand
- **Data Fetching:** TanStack Query
- **UI Components:** Radix UI

### DevOps

- **CI/CD:** GitHub Actions
  - Automated testing on pull requests
  - Security scanning and dependency updates
- **Hosting:** Fly.io
- **Secrets:** Environment variables / Fly.io Secret Management

> 📚 **See [GitHub Actions Guide](./docs/github-actions-guide.md) for complete CI/CD setup instructions**

## Project Structure

```text
CAPS360/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── models/         # Supabase data models/interfaces
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   └── server.ts       # Main server file
│   ├── tests/              # Backend tests
│   └── Dockerfile          # Fly.io deployment
├── frontend-web/           # React web application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and API client
│   │   └── styles/         # TailwindCSS config
│   └── tests/              # Frontend tests
├── frontend-mobile/        # React Native app
│   ├── src/
│   │   ├── screens/        # Mobile screens
│   │   ├── components/     # Mobile components
│   │   └── navigation/     # React Navigation setup
│   └── app.json            # Expo configuration
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── fly-backend.toml        # Fly.io configuration
└── fly-frontend.toml       # Fly.io configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- [Flyctl](https://fly.io/docs/hands-on/install-flyctl/) (for deployment)
- Docker (for local testing)
- Expo CLI (for mobile development)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase and Gemini API credentials
npm run dev
```

### Frontend Web Setup

```bash
cd frontend-web
npm install
cp .env.example .env
# Edit .env with backend API URL
npm run dev
```

### Frontend Mobile Setup

```bash
cd frontend-mobile
npm install
npx expo start
```

## Environment Variables

### Backend (.env)

```dotenv
PORT=8080
NODE_ENV=development
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
PAYFAST_MERCHANT_ID=your-payfast-merchant-id
PAYFAST_MERCHANT_KEY=your-payfast-merchant-key
PAYSTACK_SECRET_KEY=your-paystack-secret-key
JWT_SECRET=your-jwt-secret
```

### Frontend (.env)

```dotenv
VITE_API_URL=http://localhost:8080
VITE_PAYSTACK_PUBLIC_KEY=your-paystack-public-key
```

## GitHub Setup

### Quick Setup (Automated)

Run the automated setup script:

```bash
.\scripts\setup-github.ps1
```

This will:

- Initialize Git repository
- Update configuration files
- Create initial commit
- Provide next steps for GitHub connection

### Manual Setup

1. **Initialize Git and push to GitHub:**

   ```bash
   git init
   git add .
   git commit -m "Initial commit: CAPS360 platform"
   git remote add origin https://github.com/YOUR_USERNAME/CAPS360.git
   git branch -M main
   git push -u origin main
   ```

2. **Configure Fly.io:**
   Ensure you have `FLY_API_TOKEN` set in your GitHub repository secrets.

3. **Configure GitHub Secrets:**
   - Go to Repository → Settings → Secrets and variables → Actions
   - Add required secrets (see [GitHub Actions Guide](./docs/github-actions-guide.md))

4. **Enable GitHub Actions:**
   - Workflows will automatically run on push/PR
   - Check the Actions tab to monitor deployments

## Deployment

### Automated Deployment (via GitHub Actions)

Once GitHub Actions is set up, deployments happen automatically:

- **Backend:** Deploys to Fly.io on push to `master` when `backend/**` or `fly-backend.toml` changes
- **Frontend:** Deploys to Fly.io on push to `master` when `frontend-web/**` or `fly-frontend.toml` changes

### Manual Deployment

### Deploy to Fly.io

```bash
# Backend
flyctl deploy --config fly-backend.toml

# Frontend
flyctl deploy --config fly-frontend.toml
```

## Testing

### Run Backend Tests

```bash
cd backend
npm test                    # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests
```

### Run Frontend Tests

```bash
cd frontend-web
npm test                    # Component tests
npm run test:e2e           # Playwright E2E tests
```

### API Testing with Postman

```bash
newman run backend/postman/CAPS360.postman_collection.json \
  --environment backend/postman/dev.postman_environment.json
```

## Documentation

- [Architecture Overview](./docs/architecture.md)
- [API Reference](./docs/api-reference.md)
- [Payment Flows](./docs/payment-flows.md)
- [Deployment Guide](./docs/deployment.md)

## License

Proprietary - All rights reserved

## Support

For support, email <support@caps360.co.za>
