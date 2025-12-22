# CAPS360 - Quick Start Guide

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- Docker (optional, for local testing)
- Supabase account (for database and storage)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/CAPS360.git
cd CAPS360
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
# Required: SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY, JWT_SECRET
# Optional for local dev: PayFast and Paystack keys

# Run in development mode
npm run dev
```

Backend will run on `http://localhost:8080`

### 3. Frontend Web Setup

```bash
cd frontend-web

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env
# VITE_API_URL=http://localhost:8080

# Run in development mode
npm run dev
```

Frontend will run on `http://localhost:3000`

### 4. Test the Application

1. Open `http://localhost:3000` in your browser
2. Click "Get Started" to sign up
3. Fill in the registration form
4. Choose "Start Free Trial" or "Choose a Plan"
5. Explore the dashboard

## Key Features to Test

### Authentication

- Sign up with email/password
- Login
- Logout

### Subscription Tiers

- **Study Help** (R39/month): Basic features
- **Standard** (R99/month): AI Tutor + unlimited quizzes
- **Premium** (R149/month): Everything + Teacher/Parent portals

### Trial & Welcome Premium

- **Free Trial**: 14 days of Premium access, no payment required
- **Welcome Premium**: Pay immediately, get 14 days Premium bonus

### AI Features (requires GEMINI_API_KEY)

- AI Tutor Chat
- Quiz Generator
- Assignment Grading (Premium)
- Lesson Planner (Premium)

## Project Structure

```
CAPS360/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── config/      # Configuration
│   │   ├── models/      # Data models
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API routes
│   │   └── server.ts    # Main server
│   └── Dockerfile       # Fly.io deployment
├── frontend-web/        # React web app
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # API client & utilities
│   │   └── store/       # Zustand state
│   └── vite.config.ts
├── frontend-mobile/     # React Native app
├── docs/                # Documentation
└── .github/workflows/   # CI/CD
```

## Common Commands

### Backend

```bash
npm run dev          # Development mode
npm run build        # Build TypeScript
npm start            # Production mode
npm test             # Run tests
```

### Frontend Web

```bash
npm run dev          # Development mode
npm run build        # Production build
npm run preview      # Preview production build
```

## Environment Variables

### Backend (.env)

```
PORT=8080
NODE_ENV=development
SUPABASE_URL=your-url
SUPABASE_ANON_KEY=your-key
GEMINI_API_KEY=your-gemini-key
JWT_SECRET=your-secret-key
PAYFAST_MERCHANT_ID=your-payfast-id
PAYFAST_MERCHANT_KEY=your-payfast-key
PAYSTACK_SECRET_KEY=your-paystack-key
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:8080
VITE_PAYSTACK_PUBLIC_KEY=your-paystack-public-key
```

## Troubleshooting

### Backend won't start

- Check Node.js version: `node --version` (should be 18+)
- Verify .env file exists and has required variables
- Check port 8080 is not in use

### Frontend can't connect to API

- Verify backend is running on port 8080
- Check VITE_API_URL in frontend .env
- Check browser console for CORS errors

### AI features not working

- Verify GEMINI_API_KEY is set in backend .env
- Check API key is valid
- Check backend logs for AI service errors

## Next Steps

1. **Customize Branding**: Update colors in `frontend-web/tailwind.config.js`
2. **Add Content**: Create courses and lessons in Supabase
3. **Configure Payments**: Set up PayFast and Paystack accounts
4. **Deploy**: Follow `docs/deployment.md` for production deployment
5. **Mobile App**: Set up React Native development environment

## Support

- Documentation: `docs/`
- Architecture: `docs/architecture.md`
- Deployment: `docs/deployment.md`
- API Reference: `docs/api-reference.md`

## License

Proprietary - All rights reserved
