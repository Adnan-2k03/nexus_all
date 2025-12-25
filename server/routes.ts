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
      const adminToken = "admin-token-" + Date.now();
      (req.session as any).adminToken = adminToken;
      (req.session as any).isAdmin = true;
      req.session.save((err) => {
        if (err) {
          console.error("[Admin Login] Session save error:", err);
          return res.status(500).json({ message: "Session save failed" });
        }
        console.log("[Admin Login] Success, token generated");
        res.json({ token: adminToken });
      });
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
      // Get user ID from request - either from passport user or admin session
      let userId = req.user?.id || ((req.session as any).isAdmin ? "admin-user" : null);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Ensure admin user exists in database
      if (userId === "admin-user") {
        const existingAdmin = await storage.getUser("admin-user");
        if (!existingAdmin) {
          await storage.upsertUser({
            id: "admin-user",
            gamertag: "admin",
            coins: 10000,
          });
        }
      }

      const tournament = await storage.createTournament({
        ...req.body,
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
      const { inGameName, inGameId, saveProfile } = req.body;

      if (!inGameName || !inGameId) {
        return res.status(400).json({ message: "In-game name and ID are required" });
      }

      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });

      const entryFee = (tournament as any).entryFee || 0;

      if (saveProfile) {
        await storage.updateUserGameProfiles(userId, tournament.gameName, inGameName, inGameId);
      }

      const participant = await storage.joinTournamentWithCoins(
        tournamentId, 
        userId, 
        { inGameName, inGameId }, 
        entryFee
      );

      res.status(201).json(participant);
    } catch (error: any) {
      console.error("Error joining tournament:", error);
      res.status(error.message === "Insufficient coins" ? 400 : 500).json({ message: error.message });
    }
  });

  app.post("/api/tournaments/:id/announcements", authMiddleware, async (req: any, res) => {
    try {
      const { id: tournamentId } = req.params;
      const userId = req.user?.id || ((req.session as any).isAdmin ? "admin-user" : null);
      const { message, isAnnouncement = true } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      
      // For announcements, only host or admin
      if (isAnnouncement && tournament.createdBy !== userId && !(req.session as any).isAdmin) {
        return res.status(403).json({ message: "Only the host can send announcements" });
      }

      const msg = await storage.sendTournamentMessage(tournamentId, userId, message, isAnnouncement);
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
  app.patch("/api/tournaments/:id", authMiddleware, async (req: any, res) => {
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
        return res.status(403).json({ message: "Only the host can edit this tournament" });
      }

      const [updated] = await db.update(tournaments)
        .set(req.body)
        .where(eq(tournaments.id, tournamentId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("[Tournament Update] Error:", error);
      res.status(500).json({ message: "Failed to update tournament" });
    }
  });

  const httpServer = createServer(app);

  // HMS Token Generation for Voice Channels
  app.post("/api/hms/token", authMiddleware, async (req: any, res) => {
    try {
      const { roomId, role } = req.body;
      const userId = req.user.id;
      
      if (!roomId) return res.status(400).json({ message: "Room ID is required" });
      
      const token = await hmsService.generateAuthToken(roomId, userId, role || 'guest');
      res.json({ token });
    } catch (error) {
      console.error("HMS Token Error:", error);
      res.status(500).json({ message: "Failed to generate voice channel token" });
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
      const data = insertMatchRequestSchema.parse(req.body);
      const matchRequest = await storage.createMatchRequest({
        ...data,
        userId: req.user.id,
      });
      res.status(201).json(matchRequest);
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
      // Return admin user data
      res.json({
        id: "admin-user",
        gamertag: "admin",
        isAdmin: true,
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

  return httpServer;
}
