# Nexus Match - Gaming Matchmaking Platform

## Overview
Nexus is a real-time player finding system for competitive gaming. The platform connects gamers looking for teammates and opponents through WebSocket-powered live updates, voice channels, and smart matching algorithms.

## Project Status
✅ Successfully imported and running on Replit
- Frontend: React + TypeScript + Vite
- Backend: Express.js + PostgreSQL
- Database: Replit PostgreSQL (configured and migrated)
- Deployment: Configured for Autoscale deployment

## Architecture

### Tech Stack
**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui components
- TanStack Query v5 (data fetching)
- Wouter (routing)
- Capacitor (mobile app support)

**Backend:**
- Express.js + TypeScript
- PostgreSQL with Drizzle ORM
- WebSocket for real-time features
- Passport.js (authentication)
- Session management with connect-pg-simple

### Project Structure
```
├── client/               # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable UI components
│   │   ├── lib/         # API utilities
│   │   └── hooks/       # Custom React hooks
│   └── index.html
├── server/              # Express backend
│   ├── index.ts        # Server entry point
│   ├── routes.ts       # API routes
│   ├── storage.ts      # Data layer
│   └── vite.ts         # Vite dev integration
├── shared/
│   └── schema.ts       # Database schema (Drizzle ORM)
└── package.json
```

## Configuration

### Environment Variables
Required:
- `DATABASE_URL` - PostgreSQL connection string (auto-configured in Replit)
- `SESSION_SECRET` - Session encryption key (auto-configured)

Optional (for enhanced features):
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `FIREBASE_PROJECT_ID` / `FIREBASE_PRIVATE_KEY` / `FIREBASE_CLIENT_EMAIL` - Phone verification
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` - Push notifications
- `HMS_APP_ACCESS_KEY` / `HMS_APP_SECRET` - 100ms voice channels

### Development
The app runs in dev mode with:
- Frontend: Vite dev server on port 5000 (0.0.0.0)
- Backend: Express server with Vite middleware
- Hot module reload enabled
- CORS configured for development

Host configuration is properly set:
- Frontend server: `0.0.0.0:5000` (allows Replit proxy)
- `allowedHosts: true` in vite.config.ts (required for Replit iframe)
- HMR configured with `clientPort: 443`

### Production Build
Build command: `npm run build`
- Compiles frontend to `dist/public`
- Bundles backend to `dist/index.js`

Run command: `node dist/index.js`
- Serves static frontend from `dist/public`
- API endpoints on `/api/*`
- Single port 5000 for both frontend and backend

## Database

### Schema
Key tables:
- `users` - Player profiles with gaming info
- `match_requests` - Match advertisements (LFG/LFO)
- `match_connections` - Match-based player connections
- `connection_requests` - Direct user-to-user connections
- `notifications` - Real-time notification system
- `games` - Supported games database
- `user_game_profiles` - Player stats per game
- `voice_channels` - 100ms voice integration

Database is managed with Drizzle ORM. Schema changes are pushed with:
```bash
npm run db:push
```

## Features

### Core Features
1. **Real-Time Match Finding** - WebSocket-powered live feed
2. **Player Profiles** - Detailed gamer profiles with stats
3. **Match Requests** - LFG (Looking for Group) and LFO (Looking for Opponent)
4. **Connections** - Player networking system
5. **Notifications** - Real-time alerts for matches and connections
6. **Voice Channels** - Integrated voice communication (100ms)
7. **PWA Support** - Installable web app with offline support

### Authentication
Supports multiple auth methods:
- Google OAuth (optional)
- Phone number verification via Firebase (optional)
- Local registration (email/password)

Note: In dev mode, authentication warnings are normal if OAuth is not configured.

## Mobile Support
Capacitor configuration included for Android and iOS builds:
- `capacitor.config.ts` - Production config
- `capacitor.config.dev.ts` - Development config
- AdMob integration for monetization
- Firebase Authentication for mobile

## Recent Updates (December 7, 2024)
- ✅ Successfully imported from GitHub
- ✅ Installed all dependencies (1000+ packages)
- ✅ Database schema migrated successfully
- ✅ Workflow configured for port 5000 with webview
- ✅ Deployment configured for Autoscale
- ✅ Frontend verified working with proper host configuration
- ✅ Backend verified running on port 5000

## Notes
- The app was originally deployed on Vercel (frontend) + Railway (backend)
- Replit deployment uses a unified approach with one server serving both
- Some external services (Firebase, Google OAuth, 100ms) are optional and will show warnings if not configured
- All core functionality works without external services
