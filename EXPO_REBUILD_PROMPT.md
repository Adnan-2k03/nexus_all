# NexusMatch Rebuild Prompt (Expo Go & Replit Buildathon)

## Project Vision
Rebuild **NexusMatch**, a real-time gaming community platform, as a high-performance mobile application using **Expo Go**. The app connects competitive gamers (LFG/LFO) for matchmaking, team building, and community engagement.

## Core Tech Stack
- **Frontend**: React Native with Expo (Managed Workflow)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: TanStack Query (React Query)
- **Real-time**: WebSockets (Socket.io or native WS)
- **Authentication**: Firebase Auth (Native Google & Phone/OTP)
- **Backend**: Node.js/Express (hosted on Replit)
- **Database**: PostgreSQL with Drizzle ORM
- **Voice**: 100ms SDK for React Native

## Detailed Functional Requirements

### 1. User Authentication & Profiles
- **Firebase Auth**: Implement native Google Sign-In and Phone Number (OTP) verification.
- **Gamer Profiles**: Users create a profile with:
  - Gamertag (unique)
  - Preferred Games (Valorant, CS2, etc.)
  - Skill Levels/Ranks
  - Bio and Location
- **Progression**: XP and Leveling system based on activity.

### 2. Matchmaking Feed (LFG/LFO)
- **Real-time Feed**: Use WebSockets to push new match requests instantly.
- **Filtering**: Search by Game, Region, Skill Level, and Match Type (Competitive, Casual).
- **Match Cards**: Display player info, game mode, and "Apply/Join" button.

### 3. Connections & Messaging
- **Connection Requests**: Swipe or tap to request connection with other players.
- **Instant Messaging**: Real-time chat between connected users.
- **Notifications**: Push notifications for new requests and messages.

### 4. Tournaments & Teams
- **Tournament Discovery**: List of upcoming tournaments with entry fees (credits).
- **Team Formation**: Create or join teams for specific events.
- **Admin Panel**: Backend routes to manage tournament status and brackets.

### 5. Monetization & Gamification
- **Credit System**: In-app currency (Coins) used for posting matches and boosting profiles.
- **Daily Rewards**: Claim coins every 24 hours.
- **Ads (Expo-compatible)**: Integrate AdMob (or similar) for Rewarded Ads to earn credits.

### 6. Voice Communication
- **Integrated Voice**: Use 100ms SDK to create voice channels for team coordination directly in the app.

## Data Schema (Drizzle ORM)
Implement the following tables:
- `users`: id, gamertag, email, phone, coins, xp, level, preferred_games.
- `match_requests`: user_id, game_name, game_mode, region, status.
- `connections`: user_a_id, user_b_id, status.
- `tournaments`: name, game_name, prize_pool, status.

## UI/UX Guidelines
- **Theme**: "Cyberpunk Neon" (Dark mode by default, vibrant accents).
- **Navigation**: Bottom Tab Bar (Home, Discover, Messages, Profile).
- **Performance**: Use FlashList for smooth scrolling in match feeds.

## Buildathon Goal
Ensure the app is fully functional in **Expo Go** with a "single-click" setup. Use Replit's environment variables for Firebase and 100ms secrets.
