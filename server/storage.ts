export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  upsertUserByGoogleId(data: any): Promise<User>;
  claimDailyReward(userId: string): Promise<{ success: boolean; coins: number; message: string }>;
  getAllTournaments(): Promise<any[]>;
  getTournament(id: string): Promise<Tournament | undefined>;
  createTournament(t: InsertTournament): Promise<Tournament>;
  getUserTournaments(userId: string): Promise<any[]>;
  joinTournamentWithCoins(tournamentId: string, userId: string, gameDetails: any, entryFee: number): Promise<TournamentParticipant>;
  updateUserGameProfiles(userId: string, game: string, name: string, id: string): Promise<void>;
  getTournamentParticipants(tournamentId: string): Promise<TournamentParticipantWithUser[]>;
  sendTournamentMessage(tournamentId: string, senderId: string, message: string, isAnnouncement: boolean): Promise<any>;
  getTournamentMessages(tournamentId: string): Promise<any[]>;
  upsertUser(data: InsertUser): Promise<User>;
  getUserGameProfiles(userId: string): Promise<any[]>;
  createGameProfile(data: any): Promise<void>;
  getUserHobbies(userId: string): Promise<any[]>;
  createHobby(data: InsertHobby): Promise<Hobby>;
  getUserByGamertag(gamertag: string): Promise<User | undefined>;
  createUser(data: any): Promise<User>;
  getMatchRequests(filters: any): Promise<any>;
  createMatchRequest(data: any): Promise<any>;
}
import { User, InsertUser, Tournament, InsertTournament, TournamentParticipant, TournamentParticipantWithUser, users, tournaments, tournamentParticipants, tournamentMessages, hobbies, Hobby, InsertHobby } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async upsertUserByGoogleId(data: any): Promise<User> {
    const existing = await this.getUserByGoogleId(data.googleId);
    if (existing) {
      const [updated] = await db.update(users).set(data).where(eq(users.id, existing.id)).returning();
      return updated;
    }
    const [inserted] = await db.insert(users).values({ 
      ...data, 
      gamertag: `player_${Math.floor(Math.random() * 10000)}`,
      coins: 100
    }).returning();
    return inserted;
  }

  async getUserByGamertag(gamertag: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.gamertag, gamertag));
    return user;
  }

  async createUser(data: any): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async claimDailyReward(userId: string): Promise<{ success: boolean; coins: number; message: string }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    const now = new Date();
    const lastClaimed = user.dailyRewardLastClaimed ? new Date(user.dailyRewardLastClaimed) : null;
    if (lastClaimed) {
      const diff = now.getTime() - lastClaimed.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        return { success: false, coins: user.coins || 0, message: "Too early!" };
      }
    }
    const [updated] = await db.update(users).set({ coins: (user.coins || 0) + 50, dailyRewardLastClaimed: now }).where(eq(users.id, userId)).returning();
    return { success: true, coins: updated.coins || 0, message: "Claimed 50 coins!" };
  }

  async getAllTournaments(): Promise<any[]> {
    const ts = await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
    const results = [];
    for (const t of ts) {
      const [participantCountRow] = await db
        .select({ count: sql`count(*)` })
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.tournamentId, t.id));
      results.push({
        ...t,
        participantCount: Number(participantCountRow?.count || 0)
      });
    }
    return results;
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return t;
  }

  async createTournament(t: InsertTournament): Promise<Tournament> {
    const [newT] = await db.insert(tournaments).values(t).returning();
    return newT;
  }

  async getUserTournaments(userId: string): Promise<any[]> {
    return db.select().from(tournaments)
      .leftJoin(tournamentParticipants, eq(tournaments.id, tournamentParticipants.tournamentId))
      .where(and(eq(tournamentParticipants.userId, userId)))
      .then(rows => rows.map(r => r.tournaments));
  }

  async joinTournamentWithCoins(tournamentId: string, userId: string, gameDetails: any, entryFee: number): Promise<TournamentParticipant> {
    const user = await this.getUser(userId);
    if (!user || (user.coins || 0) < entryFee) throw new Error("Insufficient coins");
    return db.transaction(async (tx) => {
      await tx.update(users).set({ coins: (user.coins || 0) - entryFee }).where(eq(users.id, userId));
      const [p] = await tx.insert(tournamentParticipants).values({ tournamentId, userId, gameDetails }).returning();
      return p;
    });
  }

  async updateUserGameProfiles(userId: string, game: string, name: string, id: string): Promise<void> {
    const user = await this.getUser(userId);
    const profiles = (user?.gameProfiles as any) || {};
    profiles[game] = { inGameName: name, inGameId: id };
    await db.update(users).set({ gameProfiles: profiles }).where(eq(users.id, userId));
  }

  async getTournamentParticipants(tournamentId: string): Promise<TournamentParticipantWithUser[]> {
    return db.select({
      id: tournamentParticipants.id,
      tournamentId: tournamentParticipants.tournamentId,
      userId: tournamentParticipants.userId,
      status: tournamentParticipants.status,
      createdAt: tournamentParticipants.createdAt,
      gamertag: users.gamertag,
      profileImageUrl: users.profileImageUrl,
      gameDetails: tournamentParticipants.gameDetails,
    }).from(tournamentParticipants)
      .innerJoin(users, eq(tournamentParticipants.userId, users.id))
      .where(eq(tournamentParticipants.tournamentId, tournamentId)) as any;
  }

  async removeTournamentParticipant(tournamentId: string, participantId: string): Promise<void> {
    await db.delete(tournamentParticipants)
      .where(and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.id, participantId)
      ));
  }

  async sendTournamentMessage(tournamentId: string, senderId: string, message: string, isAnnouncement: boolean): Promise<any> {
    const [m] = await db.insert(tournamentMessages).values({ tournamentId, senderId, message, isAnnouncement }).returning();
    return m;
  }

  async getTournamentMessages(tournamentId: string): Promise<any[]> {
    return db.select({
      id: tournamentMessages.id,
      message: tournamentMessages.message,
      isAnnouncement: tournamentMessages.isAnnouncement,
      createdAt: tournamentMessages.createdAt,
      senderGamertag: users.gamertag,
    }).from(tournamentMessages)
      .leftJoin(users, eq(tournamentMessages.senderId, users.id))
      .where(eq(tournamentMessages.tournamentId, tournamentId))
      .orderBy(tournamentMessages.createdAt);
  }

  async upsertUser(data: InsertUser): Promise<User> {
    const [existing] = await db.select().from(users).where(eq(users.id, data.id!));
    if (existing) {
      const [updated] = await db.update(users).set(data).where(eq(users.id, existing.id)).returning();
      return updated;
    }
    const [inserted] = await db.insert(users).values(data).returning();
    return inserted;
  }

  async getUserGameProfiles(userId: string): Promise<any[]> {
    const user = await this.getUser(userId);
    return user?.gameProfiles ? Object.entries(user.gameProfiles).map(([name, data]: [string, any]) => ({ gameName: name, ...data })) : [];
  }

  async createGameProfile(data: any): Promise<void> {
    const user = await this.getUser(data.userId);
    const profiles = (user?.gameProfiles as any) || {};
    profiles[data.gameName] = data;
    await db.update(users).set({ gameProfiles: profiles }).where(eq(users.id, data.userId));
  }

  async getUserHobbies(userId: string): Promise<any[]> {
    return db.select().from(hobbies).where(eq(hobbies.userId, userId));
  }

  async createHobby(data: InsertHobby): Promise<Hobby> {
    const [hobby] = await db.insert(hobbies).values(data).returning();
    return hobby;
  }

  async getMatchRequests(filters: any): Promise<any> {
    const { page = 1, limit = 10, game, mode, platform, language, search } = filters;
    const offset = (page - 1) * limit;
    
    // Stub implementation for now
    return { matchRequests: [], total: 0 };
  }

  async createMatchRequest(data: any): Promise<any> {
    // Stub implementation for now
    return {};
  }
}

export const storage = new DatabaseStorage();
