import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSession } from "./googleAuth";
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
import { eq as dbEq, desc as dbDesc, eq, and, desc, or } from "drizzle-orm";
import { users, tournaments, tournamentParticipants, tournamentMessages } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Development mode flag - bypass authentication when explicitly enabled
const DEV_MODE = process.env.AUTH_DISABLED === "true";

// Choose authentication middleware based on mode
const authMiddleware = DEV_MODE ? devAuthMiddleware : isAuthenticated;

export async function registerRoutes(app: Express): Promise<Server> {
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
    console.log("   To enable authentication: Remove AUTH_DISABLED from secrets or set to 'false'\n");
    await ensureDevUser();
  } else {
    console.log("\n🔐 [PRODUCTION MODE] Authentication is ENABLED");
    console.log("   Google OAuth is required for all protected routes\n");
    await setupAuth(app);
  }

  // --- Admin Login ---
  app.post("/api/admin/login", async (req, res) => {
    const { password } = req.body;
    console.log(`[Admin Login] Attempt with password: ${password}`);
    console.log(`[Admin Login] Expected password: ${process.env.ADMIN_PASSWORD}`);
    if (password === process.env.ADMIN_PASSWORD) {
      try {
        // Load admin user's stored preferences
        const adminUser = await storage.getUser("admin-user");
        
        const adminToken = "admin-token-" + Date.now();
        (req.session as any).adminToken = adminToken;
        (req.session as any).isAdmin = true;
        // Load rewardsOverlayEnabled from stored user data
        (req.session as any).rewardsOverlayEnabled = adminUser?.rewardsOverlayEnabled;
        
        req.session.save((err) => {
          if (err) {
            console.error("[Admin Login] Session save error:", err);
            return res.status(500).json({ message: "Session save failed" });
          }
          console.log("[Admin Login] Success, token generated");
          res.json({ token: adminToken });
        });
      } catch (error) {
        console.error("[Admin Login] Error loading admin user:", error);
        res.status(500).json({ message: "Failed to load admin preferences" });
      }
    } else {
      console.warn("[Admin Login] Invalid password attempt");
      res.status(401).json({ message: "Invalid admin password" });
    }
  });

  // --- Gamertag Login ---
  app.post("/api/auth/gamertag-login", async (req, res) => {
    const { gamertag } = req.body;
    if (!gamertag || gamertag.length < 3) {
      return res.status(400).json({ message: "Gamertag must be at least 3 characters" });
    }
    try {
      let user = await storage.getUserByGamertag(gamertag);
      if (!user) {
        user = await storage.createUser({ gamertag, coins: 100 });
      }
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        req.session.save((err) => {
          if (err) return res.status(500).json({ message: "Session save failed" });
          res.json(user);
        });
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- Daily Rewards ---
  app.post("/api/user/claim-reward", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = await storage.claimDailyReward(userId);
      res.json(result);
    } catch (error) {
      console.error("Error claiming reward:", error);
      res.status(500).json({ message: "Failed to claim reward" });
    }
  });

  // --- Ad Rewards & Credits ---
  app.post("/api/credits/reward-ad", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = await storage.rewardAdCredit(userId);
      res.json(result);
    } catch (error) {
      console.error("Error rewarding ad credit:", error);
      res.status(500).json({ message: "Failed to reward credits" });
    }
  });

  app.get("/api/user/credits", authMiddleware, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ balance: user.coins || 0 });
    } catch (error) {
      console.error("Error fetching credits:", error);
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
      console.error("Error deducting credits:", error);
      res.status(error.message?.includes("Insufficient") ? 400 : 500).json({ message: error.message || "Failed to deduct credits" });
    }
  });

  // --- Subscription Management ---
  app.post("/api/subscription/purchase/:tier", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tier = req.params.tier as string;
      
      if (!["pro", "gold"].includes(tier)) {
        return res.status(400).json({ message: "Invalid subscription tier" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Define pricing and limits
      const tiers: { [key: string]: { cost: number; requestLimit: number } } = {
        pro: { cost: 150, requestLimit: 15 },
        gold: { cost: 300, requestLimit: 30 },
      };

      const tierInfo = tiers[tier];
      const currentCredits = user.coins || 0;

      if (currentCredits < tierInfo.cost) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Deduct credits and set subscription
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 2); // 2 days validity

      const [updated] = await db
        .update(users)
        .set({
          coins: currentCredits - tierInfo.cost,
          subscriptionTier: tier as any,
          subscriptionEndDate: expiryDate,
          connectionRequestsUsedToday: 0,
          lastConnectionRequestReset: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      // Log transaction
      await db.insert(creditTransactions).values({
        userId,
        amount: -tierInfo.cost,
        type: "subscription_charge",
      });

      res.json({
        success: true,
        message: `${tier.toUpperCase()} subscription purchased for 2 days!`,
        user: updated,
      });
    } catch (error: any) {
      console.error("Error purchasing subscription:", error);
      res.status(500).json({ message: error.message || "Failed to purchase subscription" });
    }
  });

  app.get("/api/subscription/status", authMiddleware, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const now = new Date();
      const isActive = user.subscriptionEndDate && new Date(user.subscriptionEndDate) > now;
      const daysRemaining = isActive && user.subscriptionEndDate
        ? Math.ceil((new Date(user.subscriptionEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const requestLimits: { [key: string]: number } = {
        free: 3,
        pro: 15,
        gold: 30,
      };

      const currentTier: string = isActive ? (user.subscriptionTier || "free") : "free";
      const dailyLimit = requestLimits[currentTier] || 3;

      // Reset daily counter if needed
      const lastReset = user.lastConnectionRequestReset ? new Date(user.lastConnectionRequestReset) : new Date();
      const now24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      if (lastReset < now24hAgo) {
        await db.update(users).set({
          connectionRequestsUsedToday: 0,
          lastConnectionRequestReset: new Date(),
        }).where(eq(users.id, req.user.id));
      }

      res.json({
        tier: currentTier,
        isActive,
        daysRemaining,
        dailyLimit,
        requestsUsedToday: user.connectionRequestsUsedToday || 0,
        requestsRemaining: Math.max(0, dailyLimit - (user.connectionRequestsUsedToday || 0)),
      });
    } catch (error: any) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // --- Tournaments ---
  // --- Tournaments ---
  app.get("/api/tournaments", async (req, res) => {
    try {
      const result = await storage.getAllTournaments();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tournaments" });
    }
  });

  app.post("/api/tournaments", authMiddleware, async (req: any, res) => {
    try {
      const isAdmin = (req.session as any).isAdmin;
      if (!isAdmin) {
        return res.status(403).json({ message: "Only administrators can create tournaments" });
      }

      const userId = "admin-user";
      // Ensure admin user exists in database
      const existingAdmin = await storage.getUser("admin-user");
      if (!existingAdmin) {
        await storage.upsertUser({
          id: "admin-user",
          gamertag: "admin",
          coins: 10000,
        });
      }

      // Parse and validate tournament data
      let tournamentData = { ...req.body };
      
      if (typeof tournamentData.maxParticipants === 'string') {
        tournamentData.maxParticipants = parseInt(tournamentData.maxParticipants);
      }
      
      if (typeof tournamentData.playersPerTeam === 'string') {
        tournamentData.playersPerTeam = parseInt(tournamentData.playersPerTeam);
      }
      
      if (tournamentData.startTime) {
        if (typeof tournamentData.startTime === 'string') {
          tournamentData.startTime = new Date(tournamentData.startTime);
        }
        if (isNaN(tournamentData.startTime.getTime())) {
          tournamentData.startTime = undefined;
        }
      }

      const tournament = await storage.createTournament({
        ...tournamentData,
        createdBy: userId,
      });
      res.status(201).json(tournament);
    } catch (error) {
      console.error("[Tournament Creation] Error:", error);
      res.status(500).json({ message: "Failed to create tournament" });
    }
  });

  app.get("/api/user/:userId/tournaments", authMiddleware, async (req, res) => {
    try {
      const result = await storage.getUserTournaments(req.params.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user tournaments" });
    }
  });

  app.post("/api/tournaments/:id/join-with-coins", authMiddleware, async (req: any, res) => {
    try {
      const { id: tournamentId } = req.params;
      const userId = req.user.id;
      const { inGameName, inGameId, saveProfile, teammateIds } = req.body;

      if (!inGameName || !inGameId) {
        return res.status(400).json({ message: "In-game name and ID are required" });
      }

      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });

      const entryFee = (tournament as any).entryFee || 0;
      
      if (req.user.coins < entryFee) {
        return res.status(400).json({ message: "Insufficient coins" });
      }

      if (tournament.playersPerTeam && tournament.playersPerTeam > 1) {
        if (!teammateIds || teammateIds.length !== (tournament.playersPerTeam - 1)) {
          return res.status(400).json({ message: `Invalid teammate IDs. Need ${tournament.playersPerTeam - 1} teammates.` });
        }
        await storage.createTeam({
          tournamentId: tournament.id,
          leaderId: userId,
          memberIds: teammateIds
        });
      } else {
        await storage.joinTournamentWithCoins(
          tournamentId, 
          userId, 
          { inGameName, inGameId }, 
          entryFee
        );
      }

      if (saveProfile) {
        await storage.updateUserGameProfiles(userId, tournament.gameName, inGameName, inGameId);
      }

      res.status(201).json({ success: true });
    } catch (error: any) {
      console.error("Error joining tournament:", error);
      res.status(error.message === "Insufficient coins" ? 400 : 500).json({ message: error.message });
    }
  });

  app.get("/api/tournaments/invitations", authMiddleware, async (req, res) => {
    // Basic stub for invitations, real implementation would fetch from tournamentTeamMembers
    res.json([]); 
  });

  app.get("/api/match-history", authMiddleware, async (req, res) => {
    try {
      const history = await storage.getMatchHistory((req.user as any).id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching match history:", error);
      res.json([]);
    }
  });

  app.get("/api/team-layouts", authMiddleware, async (req, res) => {
    try {
      const layouts = await storage.getTeamLayouts((req.user as any).id);
      res.json(layouts);
    } catch (error) {
      console.error("Error fetching team layouts:", error);
      res.json([]);
    }
  });

  app.post("/api/tournaments/:id/announcements", authMiddleware, async (req: any, res) => {
    try {
      const { id: tournamentId } = req.params;
      const isAdmin = (req.session as any).isAdmin;
      const { message } = req.body;

      if (!isAdmin) {
        return res.status(403).json({ message: "Only administrators can send announcements" });
      }

      const userId = "admin-user";
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      
      const msg = await storage.sendTournamentMessage(tournamentId, userId, message, true);
      res.status(201).json(msg);
    } catch (error) {
      console.error("[Tournament Message] Error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post("/api/tournaments/:id/messages", authMiddleware, async (req: any, res) => {
    try {
      const { id: tournamentId } = req.params;
      const userId = req.user?.id || ((req.session as any).isAdmin ? "admin-user" : null);
      const { message } = req.body;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const msg = await storage.sendTournamentMessage(tournamentId, userId, message, false);
      res.status(201).json(msg);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/tournaments/:id/messages", authMiddleware, async (req: any, res) => {
    try {
      const { id: tournamentId } = req.params;
      const messages = await storage.getTournamentMessages(tournamentId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.delete("/api/tournaments/:tournamentId/participants/:participantId", authMiddleware, async (req: any, res) => {
    try {
      const { tournamentId, participantId } = req.params;
      const userId = req.user?.id || ((req.session as any).isAdmin ? "admin-user" : null);

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });

      if (tournament.createdBy !== userId && !(req.session as any).isAdmin) {
        return res.status(403).json({ message: "Only the host can remove participants" });
      }

      await storage.removeTournamentParticipant(tournamentId, participantId);
      res.json({ message: "Participant removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  app.get("/api/tournaments/:tournamentId/participants", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const participants = await storage.getTournamentParticipants(tournamentId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  // Delete tournament
  app.delete("/api/tournaments/:id", authMiddleware, async (req: any, res) => {
    try {
      const tournamentId = req.params.id;
      const userId = req.user?.id || ((req.session as any).isAdmin ? "admin-user" : null);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      if (tournament.createdBy !== userId && !(req.session as any).isAdmin) {
        return res.status(403).json({ message: "Only the host can delete this tournament" });
      }

      await db.delete(tournaments).where(eq(tournaments.id, tournamentId));
      res.json({ message: "Tournament deleted" });
    } catch (error) {
      console.error("[Tournament Delete] Error:", error);
      res.status(500).json({ message: "Failed to delete tournament" });
    }
  });

  // Update tournament
  app.patch("/api/tournaments/:id", authMiddleware, async (req: any, res: any) => {
    try {
      const tournamentId = req.params.id;
      const isAdmin = (req.session as any).isAdmin;
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Only administrators can edit tournaments" });
      }

      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      const updateData = { ...req.body };
      console.log("[Tournament Update] Updating with data:", updateData);

      // Convert startTime string to Date object if present
      if (updateData.startTime && typeof updateData.startTime === 'string') {
        const date = new Date(updateData.startTime);
        if (!isNaN(date.getTime())) {
          updateData.startTime = date;
        } else {
          delete updateData.startTime;
        }
      }

      // Ensure ROADMAP field isn't overwritten unless explicitly provided
      if (updateData.roadmapImageUrl === undefined) {
        delete updateData.roadmapImageUrl;
      }

      const [updated] = await db.update(tournaments)
        .set(updateData)
        .where(eq(tournaments.id, tournamentId))
        .returning();

      if (!updated) {
        console.error("[Tournament Update] No data returned from update");
        return res.status(500).json({ message: "Failed to update tournament" });
      }

      res.setHeader("Content-Type", "application/json");
      return res.json(updated);
    } catch (error) {
      console.error("[Tournament Update] Error:", error);
      res.setHeader("Content-Type", "application/json");
      return res.status(500).json({ message: "Failed to update tournament" });
    }
  });

  const httpServer = createServer(app);

  // HMS Token Generation for Voice Channels
  app.post("/api/hms/token", authMiddleware, async (req: any, res) => {
    try {
      const { roomId, role } = req.body;
      const userId = req.user.id;
      
      if (!roomId) return res.status(400).json({ message: "Room ID is required" });
      
      const token = await hmsService.generateAuthToken({
        roomId,
        userId,
        role: (role as 'guest' | 'host' | 'speaker') || 'guest'
      });
      res.json({ token });
    } catch (error) {
      console.error("HMS Token Error:", error);
      res.status(500).json({ message: "Failed to generate voice channel token" });
    }
  });

  // Tournament Invitation Accept/Reject
  app.post("/api/tournaments/invitations/:id/respond", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { accept } = req.body;
      const userId = req.user.id;
      
      const result = await storage.respondToInvitation(id, userId, accept);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Match Request Routes
  app.get("/api/match-requests", authMiddleware, async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const game = req.query.game as string;
    const mode = req.query.mode as string;
    const platform = req.query.platform as string;
    const language = req.query.language as string;
    const search = req.query.search as string;

    const result = await storage.getMatchRequests({
      page,
      limit,
      game,
      mode,
      platform,
      language,
      search,
    });
    res.json(result);
  });

  app.post("/api/match-requests", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const now = new Date();
      
      // Check if subscription has expired
      let currentTier = user.subscriptionTier || "free";
      let subscriptionActive = false;
      
      if (user.subscriptionEndDate) {
        subscriptionActive = new Date(user.subscriptionEndDate) > now;
      }
      
      // Reset to free tier if subscription expired
      if (!subscriptionActive && currentTier !== "free") {
        currentTier = "free";
        await db.update(users)
          .set({ subscriptionTier: "free" })
          .where(eq(users.id, userId));
      }

      // Define request limits per tier
      const requestLimits: { [key: string]: number } = {
        free: 3,
        pro: 15,
        gold: 30,
      };

      const dailyLimit = requestLimits[currentTier] || 3;
      const requestsUsedToday = user.connectionRequestsUsedToday || 0;

      // Check if daily limit exceeded
      if (requestsUsedToday >= dailyLimit) {
        return res.status(429).json({ 
          message: `You've reached your daily limit of ${dailyLimit} connection requests. Upgrade to Pro (15/day) or Gold (30/day) for more requests!`,
          requestsRemaining: 0,
          dailyLimit,
          currentTier
        });
      }

      // Reset daily counter if 24 hours have passed
      const lastReset = user.lastConnectionRequestReset ? new Date(user.lastConnectionRequestReset) : new Date();
      const now24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      let newRequestCount = requestsUsedToday + 1;

      if (lastReset < now24hAgo) {
        newRequestCount = 1;
        await db.update(users)
          .set({
            connectionRequestsUsedToday: 1,
            lastConnectionRequestReset: now,
          })
          .where(eq(users.id, userId));
      } else {
        // Increment counter
        await db.update(users)
          .set({
            connectionRequestsUsedToday: newRequestCount,
          })
          .where(eq(users.id, userId));
      }

      // Create the match request
      const data = insertMatchRequestSchema.parse(req.body);
      const matchRequest = await storage.createMatchRequest({
        ...data,
        userId: userId,
      });

      // Log transaction for connection request
      await db.insert(creditTransactions).values({
        userId,
        amount: 0, // Connection requests are free with subscription - no deduction
        type: "connection_request",
      });

      res.status(201).json({
        ...matchRequest,
        requestsRemaining: Math.max(0, dailyLimit - newRequestCount),
        dailyLimit,
        currentTier,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid match request data" });
      } else {
        console.error("[Match Request] Error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get("/api/auth/user", (req, res) => {
    // Session debug
    console.log(`[Auth Check] Session ID: ${req.sessionID}`);
    console.log(`[Auth Check] Session data: ${JSON.stringify(req.session)}`);
    console.log(`[Auth Check] User authenticated: ${req.isAuthenticated()}`);
    
    // Check for admin login (admin-only session)
    if ((req.session as any).isAdmin && (req.session as any).adminToken) {
      console.log(`[Auth Check] Admin authenticated via session`);
      // Return admin user data with overlay setting from session
      res.json({
        id: "admin-user",
        gamertag: "admin",
        isAdmin: true,
        rewardsOverlayEnabled: (req.session as any).rewardsOverlayEnabled !== false,
      });
    } else if (req.isAuthenticated()) {
      console.log(`[Auth Check] User data: ${JSON.stringify(req.user)}`);
      // Include admin status from session
      const userData = {
        ...req.user,
        isAdmin: (req.session as any).isAdmin || false,
      };
      res.json(userData);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // --- Tasks and Levels ---
  app.get("/api/tasks", authMiddleware, async (req, res) => {
    try {
      const type = req.query.type as string;
      const result = await storage.getTasks(type);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/user/tasks", authMiddleware, async (req: any, res) => {
    try {
      const result = await storage.getUserTasks(req.user.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user tasks" });
    }
  });

  app.post("/api/tasks/:id/complete", authMiddleware, async (req: any, res) => {
    try {
      const result = await storage.completeTask(req.user.id, req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // --- User Profile Update ---
  app.patch("/api/user/profile", authMiddleware, async (req: any, res) => {
    try {
      // Check if user is admin FIRST, otherwise use authenticated user
      const isAdmin = (req.session as any).isAdmin && (req.session as any).adminToken;
      const userId = isAdmin ? "admin-user" : (req.user?.id || (req.session as any).userId);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { rewardsOverlayEnabled } = req.body;
      
      const result = await storage.updateUser(userId, { rewardsOverlayEnabled });
      
      // If we're updating the admin user, we need to handle the session as well
      if (userId === "admin-user") {
        (req.session as any).rewardsOverlayEnabled = rewardsOverlayEnabled;
        req.session.save((err: any) => {
          if (err) {
            console.error("[Admin Profile] Session save error:", err);
          }
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Feature flags endpoint
  app.get("/api/feature-flags", async (req, res) => {
    try {
      // Return empty array for now - can be extended for actual feature flag management
      res.json([]);
    } catch (error) {
      console.error("[Feature Flags] Error:", error);
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  return httpServer;
}
