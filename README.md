# CAPS360 - AI-Powered Educational Platform

![CAPS360 Logo](./docs/assets/logo.png)

[![Build Status](https://dev.azure.com/YOUR_ORG/CAPS360/_apis/build/status/CAPS360?branchName=main)](https://dev.azure.com/YOUR_ORG/CAPS360/_build/latest?definitionId=1&branchName=main)

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
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Hosting:** Fly.io (or generic Docker hosting)
- **AI:** Google Gemini (via API)

### Frontend

- **Web:** React + Vite + TypeScript + TailwindCSS
- **Mobile:** React Native + Expo
- **State Management:** Zustand
- **Data Fetching:** TanStack Query
- **UI Components:** Radix UI

### DevOps

- **CI/CD:** Azure Pipelines
  - Automated testing on commits and pull requests
  - Continuous deployment to Azure
  - Build artifacts and release management
- **Hosting:** Azure App Service (Backend) + Azure Static Web Apps (Frontend)
- **Secrets:** Azure Key Vault integration

> 📚 **See [Azure DevOps Setup Guide](./docs/azure-devops-setup-guide.md) for complete CI/CD setup instructions**

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
├── azure-pipelines.yml     # Azure Pipelines configuration
└── docs/                   # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) (for deployment)
- Docker (for local testing)
- Expo CLI (for mobile development)
- Visual Studio 2022 (optional, for Azure DevOps integration)

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

## Azure DevOps Setup

### Quick Setup

1. **Create Azure DevOps Organization and Project:**
   - Go to [dev.azure.com](https://dev.azure.com)
   - Create a new organization (if needed)
   - Create a new project: `CAPS360`

2. **Connect Repository:**
   - Import or connect your GitHub repository
   - Azure Pipelines will automatically detect `azure-pipelines.yml`

3. **Configure Service Connections:**
   - Create Azure Resource Manager service connection
   - Get Static Web Apps deployment token from Azure Portal
   - Add as pipeline variables

4. **Set Up Pipeline Variables:**
   - `AZURE_SUBSCRIPTION_SERVICE_CONNECTION`: Azure service connection name
   - `AZURE_BACKEND_APP_NAME`: Azure App Service name (e.g., `caps360-backend-prod`)
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`: Static Web Apps deployment token

> 📚 **See [Azure DevOps Setup Guide](./docs/azure-devops-setup-guide.md) for detailed instructions**

### Manual Setup

For detailed step-by-step instructions on setting up Azure DevOps, configuring pipelines, and connecting from Visual Studio, refer to the comprehensive guide:

- [Azure DevOps Setup Guide](./docs/azure-devops-setup-guide.md)

This guide covers:
- Creating Azure DevOps organization and project
- Connecting GitHub repository
- Configuring service connections
- Setting up pipeline variables
- Deploying to Azure
- Visual Studio integration
- Troubleshooting common issues

## Deployment

### Automated Deployment (via Azure Pipelines)

Once Azure Pipelines is set up, deployments happen automatically:

- **Trigger:** Push to `main` or `master` branch
- **Build:** Backend and frontend are built and tested
- **Deploy:** Automatically deploys to Azure App Service (backend) and Azure Static Web Apps (frontend)
- **Monitoring:** View pipeline status in Azure DevOps

### Manual Deployment to Azure

#### Deploy Backend to Azure App Service

```bash
# Login to Azure
az login

# Build backend
cd backend
npm ci
npm run build

# Create a zip package
cd dist
zip -r ../backend-deploy.zip .
cd ..

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group caps360-prod \
  --name caps360-backend-prod \
  --src backend-deploy.zip
```

#### Deploy Frontend to Azure Static Web Apps

```bash
# Build frontend
cd frontend-web
npm ci
npm run build

# Deploy to Static Web Apps (requires SWA CLI)
npm install -g @azure/static-web-apps-cli
swa deploy ./dist \
  --deployment-token <your-token> \
  --env production
```

> 💡 **Tip:** Use the automated PowerShell/Bash scripts in the `scripts/` folder for easier deployment:
> - `scripts/deploy-to-azure.ps1` (Windows)
> - `scripts/deploy-to-azure.sh` (Linux/macOS)

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
