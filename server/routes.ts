import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSession, generateToken, jwtAuthMiddleware, verifyToken } from "./googleAuth";
import { devAuthMiddleware, ensureDevUser } from "./devAuth";
import { insertMatchRequestSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { sendPushNotification } from "./pushNotifications";
import { r2Storage, generateFileKey } from "./services/r2-storage";
import { hmsService, generateRoomName } from "./services/hms-service";
import { verifyFirebaseToken, isPhoneAuthConfigured } from "./services/firebase-admin";
import { sendPhoneCodeSchema, verifyPhoneCodeSchema, phoneRegisterSchema, registerUserSchema, creditTransactions, feedback as feedbackTable, hobbies, Hobby, InsertHobby } from "@shared/schema";
import { db } from "./db";
import { eq as dbEq, desc as dbDesc, eq, and, desc, or, sql } from "drizzle-orm";
import { users, tournaments, tournamentParticipants, tournamentMessages } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Development mode flag - bypass authentication when explicitly enabled
const DEV_MODE = process.env.AUTH_DISABLED === "true";

// Choose authentication middleware based on mode
const authMiddleware = DEV_MODE ? devAuthMiddleware : isAuthenticated;

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/feature-flags", (req, res) => {
    res.json({
      phoneAuthEnabled: true,
      googleAuthEnabled: !!process.env.GOOGLE_CLIENT_ID,
      adsEnabled: true
    });
  });

  // Serve service worker and manifest (must be before authentication)
  app.get('/sw.js', (req, res) => {
    const swPath = path.join(__dirname, '../public/sw.js');
    res.type('application/javascript');
    res.sendFile(swPath);
  });

  app.get('/manifest.json', (req, res) => {
    const manifestPath = path.join(__dirname, '../public/manifest.json');
    res.type('application/json');
    res.sendFile(manifestPath);
  });

  app.get('/offline.html', (req, res) => {
    const offlinePath = path.join(__dirname, '../public/offline.html');
    res.type('text/html');
    res.sendFile(offlinePath);
  });

  // Setup authentication (skip in dev mode)
  if (DEV_MODE) {
    console.log("\n🔓 [DEV MODE] Authentication is DISABLED for development");
    console.log("   All routes will use a mock development user");
    await ensureDevUser();
  } else {
    console.log("\n🔐 [PRODUCTION MODE] Authentication is ENABLED");
    await setupAuth(app);
  }

  // Use JWT middleware for native app support
  app.use(jwtAuthMiddleware);

  // --- Admin Login ---
  app.post("/api/admin/login", async (req, res) => {
    const { password, gamertag } = req.body;
    const currentUser = (req as any).user;
    
    // Check if password is correct
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid admin password" });
    }

    // If gamertag is provided, check if it's "adnan"
    if (gamertag) {
      if (gamertag !== "adnan") {
        return res.status(403).json({ message: "Only adnan can access admin features" });
      }
    }
    // If no gamertag provided but user is authenticated, check if current user is "adnan"
    else if (currentUser && currentUser.gamertag !== "adnan") {
      return res.status(403).json({ message: "Only adnan can access admin features" });
    }

    try {
      const adminUser = await storage.getUser("admin-user");
      const adminToken = "admin-token-" + Date.now();
      (req.session as any).adminToken = adminToken;
      (req.session as any).isAdmin = true;
      (req.session as any).rewardsOverlayEnabled = adminUser?.rewardsOverlayEnabled;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session save failed" });
        res.json({ token: adminToken, message: "Admin access granted for adnan" });
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to load admin preferences" });
    }
  });

  // --- Gamertag Login (Dev Mode Only) ---
  app.post("/api/auth/gamertag-login", async (req, res) => {
    const { gamertag, password } = req.body;
    if (!gamertag || gamertag.length < 3) return res.status(400).json({ message: "Gamertag must be at least 3 characters" });
    
    // Require password for login
    if (!password) return res.status(401).json({ message: "Password required" });
    
    try {
      // Normalize gamertag to lowercase for consistency
      const normalizedGamertag = gamertag.toLowerCase();
      let user = await storage.getUserByGamertag(normalizedGamertag);
      
      // For adnan (admin), validate against admin password
      if (normalizedGamertag === "adnan") {
        if (password !== process.env.ADMIN_PASSWORD) {
          return res.status(401).json({ message: "Invalid password" });
        }
      }
      // For other users, they just need a password (at least 6 chars)
      else {
        if (password.length < 6) {
          return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
      }
      
      if (!user) {
        // Create new user if doesn't exist
        const isAdnan = normalizedGamertag === "adnan";
        user = await storage.createUser({ gamertag: normalizedGamertag, coins: 100, isAdmin: isAdnan });
      } else if (normalizedGamertag === "adnan") {
        // Always ensure adnan has admin access
        user = await storage.updateUser(user.id, { isAdmin: true });
      }
      
      const token = generateToken(user);
      // Fetch fresh user data to ensure isAdmin is current
      const freshUser = await storage.getUser(user.id);
      res.json({ ...freshUser, token });
    } catch (error) {
      console.error("Gamertag login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Phone Authentication ---
  app.post("/api/auth/phone/verify-token", async (req, res) => {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ message: "Firebase token required" });
    }

    try {
      const decodedToken = await verifyFirebaseToken(firebaseToken);
      if (!decodedToken) {
        return res.status(401).json({ message: "Invalid Firebase token" });
      }

      const phoneNumber = decodedToken.phoneNumber;
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number not found in token" });
      }

      // Check if user exists with this phone number
      const user = await storage.getUserByPhone(phoneNumber);
      res.json({ userExists: !!user });
    } catch (error: any) {
      console.error("Phone token verification error:", error);
      res.status(401).json({ message: "Token verification failed" });
    }
  });

  app.post("/api/auth/phone/login", async (req, res) => {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ message: "Firebase token required" });
    }

    try {
      const decodedToken = await verifyFirebaseToken(firebaseToken);
      if (!decodedToken) {
        return res.status(401).json({ message: "Invalid Firebase token" });
      }

      const phoneNumber = decodedToken.phoneNumber;
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number not found in token" });
      }

      let user = await storage.getUserByPhone(phoneNumber);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        req.session.save((err) => {
          if (err) return res.status(500).json({ message: "Session save failed" });
          const token = generateToken(user);
          res.json({ ...user, token });
        });
      });
    } catch (error: any) {
      console.error("Phone login error:", error);
      res.status(401).json({ message: "Authentication failed", error: error.message });
    }
  });

  app.post("/api/auth/phone/register", async (req, res) => {
    const { firebaseToken, gamertag, firstName, lastName, age } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ message: "Firebase token required" });
    }
    if (!gamertag || gamertag.length < 3) {
      return res.status(400).json({ message: "Gamertag must be at least 3 characters" });
    }

    try {
      const decodedToken = await verifyFirebaseToken(firebaseToken);
      if (!decodedToken) {
        return res.status(401).json({ message: "Invalid Firebase token" });
      }

      const phoneNumber = decodedToken.phoneNumber;
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number not found in token" });
      }

      // Check if user already exists
      let existingUser = await storage.getUserByPhone(phoneNumber);
      if (existingUser) {
        // User exists, just login
        const userToLogin = existingUser;
        req.login(userToLogin, (err) => {
          if (err) return res.status(500).json({ message: "Login failed" });
          req.session.save((err) => {
            if (err) return res.status(500).json({ message: "Session save failed" });
            const token = generateToken(userToLogin);
            res.json({ ...userToLogin, token });
          });
        });
        return;
      }

      // Create new user with phone number
      const newUser = await storage.createUser({
        gamertag,
        phoneNumber,
        phoneVerified: true,
        firstName,
        lastName,
        age,
        coins: 100
      });

      req.login(newUser, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        req.session.save((err) => {
          if (err) return res.status(500).json({ message: "Session save failed" });
          const token = generateToken(newUser);
          res.json({ ...newUser, token });
        });
      });
    } catch (error: any) {
      console.error("Phone registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/native-login", async (req, res) => {
    // Detailed logging for debugging session issues
    console.log("🔐 [Auth API] Native login request");
    console.log("🔐 [Auth API] Headers:", JSON.stringify(req.headers));
    
    // Check if the body is an empty object but might be raw
    console.log("🔐 [Auth API] Body Content:", JSON.stringify(req.body));
    console.log("🔐 [Auth API] Body type:", typeof req.body);
    
    let body = req.body;
    
    // If the body is empty or not parsed, it might be due to content-type issues or stream not being handled
    // But since we have express.json(), it should be there. 
    // Let's add a fallback check for the token.
    
    const token = body?.token;
    
    console.log("🔐 [Auth API] Token analysis:", {
      hasToken: !!token,
      tokenType: typeof token,
      tokenLength: token?.length
    });

    if (!token) {
      console.warn("⚠️ [Auth API] Missing token in body. Body keys found:", Object.keys(body || {}));
      return res.status(400).json({ message: "Firebase token required" });
    }
    
    try {
      console.log("🔐 [Auth API] Attempting Firebase verification...");
      const decodedToken = await verifyFirebaseToken(token);
      
      if (!decodedToken) {
        console.error("❌ [Auth API] verifyFirebaseToken returned null");
        return res.status(401).json({ message: "Invalid Firebase token" });
      }
      
      console.log("✅ [Auth API] Token verified for UID:", decodedToken.uid);
      
      let user = await storage.getUser(decodedToken.uid);
      if (!user) {
        console.log("👤 [Auth API] Provisioning new user for UID:", decodedToken.uid);
        let baseGamertag = decodedToken.email?.split("@")[0] || `user_${decodedToken.uid.slice(0, 8)}`;
        baseGamertag = baseGamertag.replace(/[^a-zA-Z0-9_]/g, "_");
        
        // Ensure gamertag is unique by appending random suffix if needed
        let gamertag = baseGamertag;
        let attempts = 0;
        while (attempts < 10) {
          try {
            const existingUser = await storage.getUserByGamertag(gamertag);
            if (!existingUser) break; // Found unique gamertag
            // Gamertag exists, try with random suffix
            gamertag = `${baseGamertag}_${Math.random().toString(36).substring(2, 6)}`;
            attempts++;
          } catch {
            break; // Error checking, assume it's available
          }
        }
        
        console.log("📝 [Auth API] Creating user with gamertag:", gamertag);
        user = await storage.createUser({ 
          gamertag: gamertag,
          coins: 100 
        });
      }
      
      console.log("🔑 [Auth API] Establishing Passport session for user ID:", user.id);
      req.login(user, (err) => {
        if (err) {
          console.error("❌ [Auth API] Passport login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        req.session.save((err) => {
          if (err) {
            console.error("❌ [Auth API] Session save error:", err);
            return res.status(500).json({ message: "Session save failed" });
          }
          console.log("🏁 [Auth API] Authentication complete for:", user?.gamertag);
          const jwtToken = generateToken(user);
          console.log("🎫 [Auth API] Generated JWT for user:", user.id);
          
          // DO NOT destroy session for Capacitor. Instead, let it be saved.
          // Native apps will use the JWT token in headers.

          res.json({ ...user, token: jwtToken });
        });
      });
    } catch (error: any) {
      console.error("❌ [Auth API] Critical failure:", error.message || error);
      res.status(401).json({ message: "Authentication failed" });
    }
  });

  // --- Daily Rewards ---
  app.post("/api/user/claim-reward", authMiddleware, async (req: any, res) => {
    try {
      const result = await storage.claimDailyReward(req.user.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to claim reward" });
    }
  });

  // --- Ad Rewards & Credits ---
  app.post("/api/credits/reward-ad", authMiddleware, async (req: any, res) => {
    try {
      const result = await storage.rewardAdCredit(req.user.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to reward credits" });
    }
  });

  app.get("/api/user/credits", authMiddleware, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ balance: user.coins || 0 });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  app.post("/api/credits/deduct", authMiddleware, async (req: any, res) => {
    try {
      const { amount, type } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });
      const result = await storage.deductCredits(req.user.id, amount, type || "unknown");
      res.json(result);
    } catch (error: any) {
      res.status(error.message?.includes("Insufficient") ? 400 : 500).json({ message: error.message || "Failed to deduct credits" });
    }
  });

  // --- Subscription Management ---
  app.post("/api/subscription/purchase/:tier", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tier = req.params.tier;
      if (!["pro", "gold"].includes(tier)) return res.status(400).json({ message: "Invalid subscription tier" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const tiers: any = { pro: { cost: 150 }, gold: { cost: 300 } };
      if ((user.coins || 0) < tiers[tier].cost) return res.status(400).json({ message: "Insufficient credits" });
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 2);
      const [updated] = await db.update(users).set({
        coins: (user.coins || 0) - tiers[tier].cost,
        subscriptionTier: tier as any,
        subscriptionEndDate: expiryDate,
        connectionRequestsUsedToday: 0,
        lastConnectionRequestReset: new Date(),
      }).where(eq(users.id, userId)).returning();
      await db.insert(creditTransactions).values({ userId, amount: -tiers[tier].cost, type: "subscription_charge" });
      res.json({ success: true, user: updated });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to purchase subscription" });
    }
  });

  app.get("/api/subscription/status", authMiddleware, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const now = new Date();
      const isActive = user.subscriptionEndDate && new Date(user.subscriptionEndDate) > now;
      const currentTier = isActive ? (user.subscriptionTier || "free") : "free";
      const limits: any = { free: 3, pro: 15, gold: 30 };
      const dailyLimit = limits[currentTier];
      const lastReset = user.lastConnectionRequestReset ? new Date(user.lastConnectionRequestReset) : new Date();
      if (lastReset < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        await db.update(users).set({ connectionRequestsUsedToday: 0, lastConnectionRequestReset: new Date() }).where(eq(users.id, req.user.id));
      }
      res.json({ tier: currentTier, isActive, dailyLimit, requestsUsedToday: user.connectionRequestsUsedToday || 0, requestsRemaining: Math.max(0, dailyLimit - (user.connectionRequestsUsedToday || 0)) });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch status" });
    }
  });

  // --- Match Requests ---
  app.get("/api/match-requests", authMiddleware, async (req, res) => {
    try {
      const result = await storage.getMatchRequests({
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        game: req.query.game as string,
        mode: req.query.mode as string,
        platform: req.query.platform as string,
        language: req.query.language as string,
        search: req.query.search as string,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.post("/api/match-requests", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const cost = 10;
      if ((user.coins || 0) < cost) return res.status(400).json({ message: "Insufficient credits (10 required)" });
      const data = insertMatchRequestSchema.parse(req.body);
      const deduct = await storage.deductCredits(userId, cost, "match_posting");
      const match = await storage.createMatchRequest({ ...data, userId });
      res.status(201).json({ ...match, newBalance: deduct.balance });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/match-requests/:id", authMiddleware, async (req: any, res) => {
    try {
      const result = await storage.deleteMatchRequest(req.params.id, req.user.id);
      res.json(result);
    } catch (error: any) {
      if (error.message.includes("Unauthorized")) {
        return res.status(403).json({ message: error.message });
      }
      res.status(404).json({ message: error.message });
    }
  });

  app.post("/api/users/apply-filters", authMiddleware, async (req: any, res) => {
    try {
      const cost = 5;
      const result = await storage.deductCredits(req.user.id, cost, "filter_usage");
      res.json({ ...result, balance: result.balance });
    } catch (error: any) {
      res.status(error.message?.includes("Insufficient") ? 400 : 500).json({ message: error.message || "Failed" });
    }
  });

  // --- HMS & Tournaments & Auth & Notification routes would continue here...
  // Stubbing HMS and common routes for now to ensure server boots
  app.post("/api/hms/token", authMiddleware, async (req: any, res) => {
    res.json({ token: "stub-token" });
  });

  app.get("/api/auth/user", (req, res) => {
    // Check for user in req.user (set by passport or JWT middleware)
    const user = req.user || (req as any).user;
    const isAuthed = (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) || 
                     (req as any)._jwtAuthenticated === true;
    
    console.log("🔍 [Auth API] GET /api/auth/user. Authenticated flag:", isAuthed, "req.user present:", !!user);
    
    if (user && isAuthed) {
      console.log("✅ [Auth API] User authenticated:", user.id);
      return res.json(user);
    }

    console.warn("❌ [Auth API] Unauthorized request to /api/auth/user");
    res.status(401).json({ message: "Unauthorized" });
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/users", jwtAuthMiddleware, authMiddleware, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      console.log(`🔍 [Discover API] Request from user ${currentUserId}`);
      
      const { page = 1, limit = 9, search, gender, language, game } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      console.log("🔍 [Discover API] Query Params:", { page, limit, search, gender, language, game });

      // Build final where clause
      let finalConditions: any[] = [sql`${users.id} != ${currentUserId}`];
      if (search) {
        const searchPattern = `%${search}%`;
        const searchCondition = or(
          sql`${users.gamertag} ILIKE ${searchPattern}`,
          sql`${users.firstName} ILIKE ${searchPattern}`,
          sql`${users.lastName} ILIKE ${searchPattern}`
        );
        if (searchCondition) {
          finalConditions.push(searchCondition);
        }
      }
      if (gender && gender !== 'all') finalConditions.push(eq(users.gender, gender as any));
      if (language && language !== 'all') finalConditions.push(eq(users.language, language as string));
      
      if (game && game !== 'all') {
        finalConditions.push(sql`${users.preferredGames} @> ARRAY[${game}]::varchar[]`);
      }

      console.log("🔍 [Discover API] Building query with", finalConditions.length, "conditions");
      
      const results = await db.select()
        .from(users)
        .where(and(...finalConditions.filter(Boolean)))
        .limit(Number(limit))
        .offset(offset)
        .orderBy(desc(users.createdAt));

      console.log(`🔍 [Discover API] Found ${results.length} users`);

      const [totalRow] = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(and(...finalConditions.filter(Boolean)));
      
      const total = Number(totalRow?.count || 0);

      res.json({
        users: results,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      console.error("Discover error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/hidden-matches", authMiddleware, async (req: any, res) => {
    // Return empty array for now as requested by frontend
    res.json([]);
  });

  app.get("/api/connection-requests", authMiddleware, async (req: any, res) => {
    // Stub for connection requests
    res.json([]);
  });

  app.post("/api/connection-requests", authMiddleware, async (req: any, res) => {
    // Stub for creating connection request
    res.json({ success: true });
  });

  app.get("/api/match-connections", authMiddleware, async (req: any, res) => {
    // Stub for match connections
    res.json([]);
  });

  app.post("/api/match-connections", authMiddleware, async (req: any, res) => {
    // Stub for match connections
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  
  // Configure WebSocket server for mobile app connections
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: "/ws",
    perMessageDeflate: false, // Disable compression for mobile
  });

  // Handle WebSocket connections
  wss.on("connection", (ws) => {
    console.log("🔌 WebSocket connected");
    
    // Send initial connection message
    ws.send(JSON.stringify({ type: "connected", message: "WebSocket connected" }));
    
    // Heartbeat/ping-pong to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000); // Ping every 30 seconds
    
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        // Handle incoming messages
        console.log("📨 WebSocket message:", message);
      } catch (e) {
        // Ignore parse errors for non-JSON messages
      }
    });
    
    ws.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
    });
    
    ws.on("close", () => {
      clearInterval(heartbeatInterval);
      console.log("🔌 WebSocket disconnected");
    });
  });

  return httpServer;
}
