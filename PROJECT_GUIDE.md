# GameMatch Project - Complete Developer Guide

Welcome! This guide will help you understand the entire project structure and how to make modifications.

## 📋 Project Overview

GameMatch is a full-stack gaming platform that helps players find teammates and opponents. It's built with:
- **Frontend**: React with Vite (runs in browser)
- **Backend**: Express.js with Node.js (runs on server)
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSockets for live updates
- **Authentication**: Google OAuth + Firebase phone auth
- **Voice Chat**: 100ms (HMS) integration

---

## 📁 Project Structure

```
root/
├── client/                    # Frontend React app
│   └── src/
│       ├── components/        # UI components and pages
│       ├── contexts/          # React context (state management)
│       ├── hooks/             # Custom React hooks
│       ├── lib/               # Utility functions (API calls, auth)
│       ├── pages/             # Full page components
│       ├── App.tsx            # Main routing component
│       ├── index.css          # Global styles
│       └── main.tsx           # Entry point
├── server/                    # Backend Express app
│   ├── routes.ts              # API endpoints
│   ├── storage.ts             # Database operations
│   ├── db.ts                  # Database connection
│   ├── googleAuth.ts          # Google OAuth setup
│   ├── devAuth.ts             # Dev/testing authentication
│   ├── index.ts               # Server startup
│   └── services/              # External services (HMS, R2, Firebase)
├── shared/                    # Code shared between frontend and backend
│   └── schema.ts              # Database schema + types (Drizzle + Zod)
├── public/                    # Static files (service worker, manifest)
├── android/                   # Capacitor mobile app config
├── package.json               # Dependencies and scripts
├── vite.config.ts             # Frontend build config
└── drizzle.config.ts          # Database migrations config
```

---

## 🔄 How Data Flows (The Complete Journey)

### Step 1: Frontend Action → API Request
**File**: `client/src/components/SomeComponent.tsx`
```typescript
// User clicks a button, component makes API call
const response = await fetch('/api/match-requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(data)
});
```

### Step 2: API Request → Backend Route
**File**: `server/routes.ts`
```typescript
// Request hits Express route
app.post('/api/match-requests', authMiddleware, async (req, res) => {
  // 1. Validate input data using Zod schema
  const validatedData = insertMatchRequestSchema.parse(req.body);
  
  // 2. Call storage function
  const result = await storage.createMatchRequest(validatedData);
  
  // 3. Send response to frontend
  res.status(201).json(result);
});
```

### Step 3: Backend → Database
**File**: `server/storage.ts`
```typescript
// Storage function performs database operation
async createMatchRequest(request: InsertMatchRequest): Promise<MatchRequest> {
  const [newRequest] = await db
    .insert(matchRequests)
    .values(request)
    .returning();
  return newRequest;
}
```

### Step 4: Database Schema
**File**: `shared/schema.ts`
```typescript
// Define table structure
export const matchRequests = pgTable("match_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  gameName: varchar("game_name").notNull(),
  // ... more columns
});

// Export types for use in frontend and backend
export type MatchRequest = typeof matchRequests.$inferSelect;
export type InsertMatchRequest = typeof matchRequests.$inferInsert;
```

### Step 5: Frontend Receives & Updates UI
```typescript
// Component receives response
const data = await response.json();

// Update UI or cache
queryClient.invalidateQueries({ queryKey: ['/api/match-requests'] });
```

---

## 🔑 Key Files Explained

### Frontend

#### `client/src/App.tsx`
- **Purpose**: Main routing component that handles page navigation
- **What it does**: 
  - Checks if user is authenticated
  - Routes to different pages (home, profile, messages, etc.)
  - Manages global state (currentUser, navigation)
- **When to modify**: Add new pages or change how routing works

#### `client/src/components/`
- **Examples**: 
  - `MatchFeed.tsx` - Shows list of available matches
  - `Messages.tsx` - Chat interface
  - `UserProfile.tsx` - User profile view
  - `CreateMatchForm.tsx` - Form to create new match request
- **Pattern**: Each component imports from shadcn UI for consistent styling

#### `client/src/hooks/useAuth.ts`
- **Purpose**: Custom hook for authentication
- **What it does**: 
  - Fetches current user data
  - Handles login/logout
  - Checks if user is authenticated
- **Usage**: 
  ```typescript
  const { user, isLoading, isAuthenticated } = useAuth();
  ```

#### `client/src/lib/queryClient.ts`
- **Purpose**: TanStack Query setup for data fetching
- **What it does**: Caches API responses, handles loading/error states
- **Usage**: Used automatically when fetching data from API

---

### Backend

#### `server/routes.ts` (The API Layer)
- **Purpose**: Defines all API endpoints
- **Structure**: `app.post('/api/route', middleware, handler)`
- **Pattern for each endpoint**:
  1. Extract data from request
  2. Validate using Zod schema
  3. Call storage function
  4. Return response (JSON or error)

#### `server/storage.ts` (The Database Layer)
- **Purpose**: All database operations
- **Contains**: 
  - `DatabaseStorage` class with methods like:
    - `getUser(id)` - Get single user
    - `createMatchRequest(data)` - Insert match request
    - `getMatchRequests(filters)` - Get filtered matches
- **Why separate**: Keeps business logic separate from HTTP handling
- **Usage**: Called by routes.ts

#### `server/db.ts`
- **Purpose**: Database connection setup
- **What it does**: Connects to PostgreSQL using Drizzle ORM

---

### Shared

#### `shared/schema.ts` (The Single Source of Truth)
- **Purpose**: Define ALL data models in one place
- **Contains**:
  - **Table definitions** (using Drizzle):
    ```typescript
    export const users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      gamertag: varchar("gamertag").unique().notNull(),
      email: varchar("email").unique(),
      // ... more fields
    });
    ```
  - **Type exports** (using `$infer`):
    ```typescript
    export type User = typeof users.$inferSelect; // For querying
    export type InsertUser = typeof users.$inferInsert; // For creating
    ```
  - **Zod validation schemas**:
    ```typescript
    export const insertUserSchema = createInsertSchema(users);
    export const registerUserSchema = z.object({
      gamertag: z.string().min(3),
      email: z.string().email(),
    });
    ```

---

## 🔐 Authentication Flow

### Google OAuth (Web)
1. User clicks "Login with Google"
2. Google OAuth popup opens
3. User confirms → Google sends back auth token
4. Token sent to backend: `POST /api/auth/native-login`
5. Backend verifies token with Firebase
6. User created/updated in database
7. Session established → Frontend logged in

### Phone Authentication
1. User enters phone number
2. Firebase sends SMS code
3. User enters code → verified
4. User registers or logs in
5. Session established

### Development Mode
- Set `AUTH_DISABLED=true` in secrets
- All routes use mock development user
- Great for testing without real auth

**Files involved**:
- `server/googleAuth.ts` - Google OAuth setup
- `server/devAuth.ts` - Dev authentication
- `client/src/lib/firebase.ts` - Firebase client
- `server/services/firebase-admin.ts` - Firebase server

---

## 🎮 Data Models (What Gets Stored)

### Users
- **What**: Player profiles
- **Contains**: gamertag, profile image, location, age, preferred games
- **Table**: `users`

### Match Requests
- **What**: Posts like "Looking for teammates for Valorant 3v3"
- **Contains**: game name, mode, description, status
- **Table**: `match_requests`

### Connections
- **What**: Links between users (friends/teammates)
- **Types**: Direct connections or match-based connections
- **Tables**: `connection_requests`, `match_connections`

### Messages
- **What**: Chat between connected users
- **Table**: `chat_messages`

### Voice Channels
- **What**: Active voice calls
- **Powered by**: 100ms (HMS)
- **Table**: `voice_channels`, `group_voice_channels`

---

## 🛠️ How to Add Features

### Add a New API Endpoint

**Step 1**: Update `shared/schema.ts`
```typescript
// Add new table if needed
export const featureTable = pgTable("feature_table", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  data: text("data"),
});

// Export types
export type Feature = typeof featureTable.$inferSelect;

// Create Zod schema for validation
export const insertFeatureSchema = createInsertSchema(featureTable).omit({ 
  id: true 
});
```

**Step 2**: Add storage function to `server/storage.ts`
```typescript
// Add to IStorage interface
async createFeature(feature: InsertFeature): Promise<Feature>;

// Add to DatabaseStorage class
async createFeature(feature: InsertFeature): Promise<Feature> {
  const [newFeature] = await db
    .insert(featureTable)
    .values(feature)
    .returning();
  return newFeature;
}
```

**Step 3**: Add route to `server/routes.ts`
```typescript
app.post('/api/features', authMiddleware, async (req, res) => {
  try {
    const validatedData = insertFeatureSchema.parse(req.body);
    const feature = await storage.createFeature({
      ...validatedData,
      userId: req.user.id,
    });
    res.status(201).json(feature);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      res.status(500).json({ message: "Failed to create feature" });
    }
  }
});
```

**Step 4**: Call from Frontend
```typescript
// In React component
const response = await fetch('/api/features', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(data)
});
const result = await response.json();
```

### Add a New Page/Component

**Step 1**: Create component in `client/src/components/`
```typescript
// MyNewPage.tsx
export function MyNewPage() {
  return (
    <div className="p-6">
      <h1>My New Page</h1>
      {/* Your content */}
    </div>
  );
}
```

**Step 2**: Register in `client/src/App.tsx`
```typescript
// Import at top
import { MyNewPage } from "@/components/MyNewPage";

// Add route in Router function
<Route path="/my-new-page">
  {() => (
    <div className="min-h-screen relative">
      <GameNavigation {...props} />
      <MyNewPage />
    </div>
  )}
</Route>

// Add to handleNavigation function
const pageToUrl: { [key: string]: string } = {
  "my-new-page": "/my-new-page",
  // ... other routes
};
```

---

## 🚀 Common Tasks

### Modify User Data Model
1. Open `shared/schema.ts`
2. Find `users` table
3. Add/remove column:
   ```typescript
   newField: varchar("new_field"),
   ```
4. Add type exports if needed
5. Backend automatically syncs with: `npm run db:push`

### Add Form Validation
1. In `shared/schema.ts`, extend Zod schema:
   ```typescript
   export const myFormSchema = z.object({
     gamertag: z.string().min(3, "At least 3 chars"),
     email: z.string().email("Invalid email"),
   });
   ```
2. In component, use with react-hook-form:
   ```typescript
   const form = useForm({
     resolver: zodResolver(myFormSchema),
   });
   ```

### Show Real-time Updates
1. WebSocket broadcasts are already set up
2. Listen in component using `useWebSocket` hook
3. Update local state when new data arrives

### Debug API Issues
1. Check `server/routes.ts` for correct endpoint
2. Verify request body matches Zod schema
3. Add console.logs in route handler
4. Check browser Network tab for actual request/response

---

## 📝 Important Code Patterns

### Always Use Types
```typescript
// Good ✅
import type { User, MatchRequest } from "@shared/schema";

function MyComponent({ user }: { user: User }) {
  return <div>{user.gamertag}</div>;
}

// Bad ❌
function MyComponent({ user }: { user: any }) {
  // ...
}
```

### API Requests Pattern (Frontend)
```typescript
// Always use credentials: 'include' for authentication
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Important!
  body: JSON.stringify(data)
});

if (!response.ok) {
  throw new Error(await response.text());
}

const result = await response.json();
```

### Route Handler Pattern (Backend)
```typescript
app.post('/api/endpoint', authMiddleware, async (req: any, res) => {
  try {
    // 1. Validate
    const data = someSchema.parse(req.body);
    
    // 2. Process
    const result = await storage.someFunction(data);
    
    // 3. Respond
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal error" });
    }
  }
});
```

---

## 🔍 Debugging Tips

### Check Browser Console
- Shows frontend errors and network requests
- Network tab shows API calls and responses

### Check Server Logs
- Running `npm run dev` shows backend logs
- Look for console.error() outputs

### Check Database
- Tables defined in `shared/schema.ts`
- Query data using storage functions

### Test API Directly
```bash
# Using curl to test endpoints
curl -X POST http://localhost:5000/api/match-requests \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=..." \
  -d '{"gameName":"Valorant","gameMode":"5v5"}'
```

---

## 📚 File Reference

| File | Purpose | When to Edit |
|------|---------|--------------|
| `shared/schema.ts` | Data models & validation | Adding new data types or fields |
| `server/routes.ts` | API endpoints | Adding new API calls |
| `server/storage.ts` | Database operations | Changing how data is queried |
| `client/src/App.tsx` | Main routing | Adding new pages |
| `client/src/components/*` | UI components | Changing what users see |
| `client/src/hooks/*` | Custom logic | Sharing logic between components |
| `server/services/*` | 3rd party integrations | Configuring HMS, Firebase, R2 |

---

## 🎯 Next Steps

1. **Start Small**: Make a simple change to understand the flow
   - Example: Change a button color in `client/src/components/LandingPage.tsx`
   
2. **Add a Simple Feature**: Follow the "Add New API Endpoint" section
   - Example: Add a "favorite" field to match requests
   
3. **Test Locally**: Run `npm run dev` and test in browser

4. **Check Real-time**: Open multiple browser windows to see WebSocket updates

---

## ❓ Common Questions

**Q: Where do I add a new page?**
A: Create component in `client/src/components/`, then add route in `client/src/App.tsx`

**Q: How do I fetch data from API?**
A: Use `fetch('/api/endpoint')` in component (see API Request Pattern)

**Q: How do I validate form inputs?**
A: Define Zod schema in `shared/schema.ts`, use with `react-hook-form` in component

**Q: How do I run database queries?**
A: Add method to `server/storage.ts`, return Promise with results

**Q: How do I add authentication to a route?**
A: Add `authMiddleware` parameter: `app.post('/api/route', authMiddleware, handler)`

**Q: How do I send real-time updates to users?**
A: Use `app.broadcast?.toUsers([userId], { type: 'event', data })`

---

## 🎓 Learning Path

1. **Week 1**: Understand the flow
   - Read this guide
   - Trace one feature end-to-end
   - Make a small UI change

2. **Week 2**: Add simple features
   - Add form field to existing form
   - Create new API endpoint
   - Test with multiple users

3. **Week 3**: Complex features
   - Add real-time updates
   - Handle edge cases
   - Optimize queries

---

Good luck! You now understand the architecture. Start with small changes and build confidence.
