export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  upsertUserByGoogleId(data: any): Promise<User>;
  claimDailyReward(userId: string): Promise<{ success: boolean; coins: number; message: string }>;
  getAllTournaments(): Promise<any[]>;
  getTournament(id: string): Promise<Tournament | undefined>;
  createTournament(t: InsertTournament): Promise<Tournament>;
  getUserTournaments(userId: string): Promise<any[]>;
  joinTournamentWithCoins(tournamentId: string, userId: string, gameDetails: any, entryFee: number): Promise<TournamentParticipant>;
  updateUserGameProfiles(userId: string, game: string, name: string, id: string): Promise<void>;
  updateUser(userId: string, data: any): Promise<User>;
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
  deleteMatchRequest(id: string, userId: string): Promise<any>;
  respondToInvitation(id: string, userId: string, accept: boolean): Promise<any>;
  getTasks(type?: string): Promise<Task[]>;
  getUserTasks(userId: string): Promise<any[]>;
  completeTask(userId: string, taskId: string): Promise<{ success: boolean; message: string }>;
  rewardAdCredit(userId: string): Promise<{ success: boolean; balance: number; message: string }>;
  deductCredits(userId: string, amount: number, transactionType: string): Promise<{ success: boolean; balance: number }>;
  getFeatureFlag(featureName: string): Promise<FeatureFlag | undefined>;
  getAllFeatureFlags(): Promise<FeatureFlag[]>;
  createFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(featureName: string, data: Partial<FeatureFlag>): Promise<FeatureFlag>;
}
import { User, InsertUser, Tournament, InsertTournament, TournamentParticipant, TournamentParticipantWithUser, users, tournaments, tournamentParticipants, tournamentMessages, hobbies, Hobby, InsertHobby, tournamentTeams, tournamentTeamMembers, userSettings, matchHistory, teamLayouts, tasks, userTasks, Task, creditTransactions, matchRequests, featureFlags, FeatureFlag, InsertFeatureFlag } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, or } from "drizzle-orm";

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

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user;
  }

  async createUser(data: any): Promise<User> {
    const normalizedData = { ...data, gamertag: data.gamertag.toLowerCase() };
    const [user] = await db.insert(users).values(normalizedData).returning();
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
    
    // Add XP for claiming daily reward
    const xpGain = 50;
    const currentXp = (user.xp || 0) + xpGain;
    const currentLevel = Math.floor(Math.sqrt(currentXp / 100)) + 1;

    const [updated] = await db.update(users)
      .set({ 
        coins: (user.coins || 0) + 50, 
        dailyRewardLastClaimed: now,
        xp: currentXp,
        level: currentLevel
      })
      .where(eq(users.id, userId))
      .returning();
    return { success: true, coins: updated.coins || 0, message: `Claimed 50 coins and ${xpGain} XP!` };
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

  async updateUser(userId: string, data: any): Promise<User> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, userId)).returning();
    if (!updated && userId === "admin-user") {
      return {
        id: "admin-user",
        gamertag: "admin",
        coins: 1000,
        xp: 0,
        level: 1,
        rewardsOverlayEnabled: data.rewardsOverlayEnabled ?? false,
        voiceOverlayEnabled: true,
        ...data
      } as User;
    }
    return updated;
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

  async createTeam(data: any): Promise<any> {
    return db.transaction(async (tx) => {
      const [team] = await tx.insert(tournamentTeams).values({
        tournamentId: data.tournamentId,
        leaderId: data.leaderId,
        status: "pending"
      }).returning();

      // Add leader as accepted member
      await tx.insert(tournamentTeamMembers).values({
        teamId: team.id,
        userId: data.leaderId,
        status: "accepted"
      });

      // Invite teammates
      for (const memberId of data.memberIds) {
        // Check auto-confirm
        const [settings] = await tx.select().from(userSettings).where(eq(userSettings.userId, memberId));
        const status = settings?.autoAcceptFrom?.includes(data.leaderId) ? "accepted" : "pending";
        
        await tx.insert(tournamentTeamMembers).values({
          teamId: team.id,
          userId: memberId,
          status
        });
      }

      return team;
    });
  }

  async acceptInvite(teamId: string, userId: string): Promise<void> {
    await db.update(tournamentTeamMembers)
      .set({ status: "accepted" })
      .where(and(eq(tournamentTeamMembers.teamId, teamId), eq(tournamentTeamMembers.userId, userId)));

    // Check if all members accepted
    const members = await db.select().from(tournamentTeamMembers).where(eq(tournamentTeamMembers.teamId, teamId));
    if (members.every(m => m.status === "accepted")) {
      await db.update(tournamentTeams).set({ status: "confirmed" }).where(eq(tournamentTeams.id, teamId));
    }
  }

  async getMatchHistory(userId: string): Promise<any[]> {
    return db.select().from(matchHistory).where(eq(matchHistory.userId, userId)).orderBy(desc(matchHistory.date));
  }

  async saveTeamLayout(data: any): Promise<void> {
    await db.insert(teamLayouts).values(data);
  }

  async getTeamLayouts(userId: string): Promise<any[]> {
    return db.select().from(teamLayouts).where(eq(teamLayouts.userId, userId));
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
    
    let query = db.select({
      id: matchRequests.id,
      userId: matchRequests.userId,
      gameName: matchRequests.gameName,
      gameMode: matchRequests.gameMode,
      region: matchRequests.region,
      matchType: matchRequests.matchType,
      duration: matchRequests.duration,
      description: matchRequests.description,
      tournamentName: matchRequests.tournamentName,
      status: matchRequests.status,
      createdAt: matchRequests.createdAt,
      gamertag: users.gamertag,
      profileImageUrl: users.profileImageUrl,
    })
    .from(matchRequests)
    .innerJoin(users, eq(matchRequests.userId, users.id));

    const conditions = [];
    if (game) conditions.push(sql`${matchRequests.gameName} ILIKE ${'%' + game + '%'}`);
    if (mode) conditions.push(eq(matchRequests.gameMode, mode));
    if (platform) conditions.push(eq(matchRequests.region, platform)); 
    if (language) conditions.push(eq(users.language, language));
    if (search) {
      conditions.push(or(
        sql`${matchRequests.gameName} ILIKE ${'%' + search + '%'}`,
        sql`${matchRequests.description} ILIKE ${'%' + search + '%'}`
      ));
    }

    let finalQuery = conditions.length > 0 
      ? query.where(and(...conditions)) 
      : query;

    const results = await finalQuery
      .orderBy(desc(matchRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await db.select({ count: sql`count(*)` }).from(matchRequests);
    const total = Number(totalRow?.count || 0);

    return { 
      matchRequests: results, 
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async createMatchRequest(data: any): Promise<any> {
    const [match] = await db.insert(matchRequests).values(data).returning();
    return match;
  }

  async deleteMatchRequest(id: string, userId: string): Promise<any> {
    const [match] = await db.select().from(matchRequests).where(eq(matchRequests.id, id));
    if (!match) throw new Error("Match request not found");
    if (match.userId !== userId) throw new Error("Unauthorized");
    await db.delete(matchRequests).where(eq(matchRequests.id, id));
    return { success: true, message: "Match request deleted" };
  }

  async respondToInvitation(id: string, userId: string, accept: boolean): Promise<any> {
    return { success: true };
  }

  async getTasks(type?: string): Promise<Task[]> {
    if (type) {
      return db.select().from(tasks).where(eq(tasks.type, type));
    }
    return db.select().from(tasks);
  }

  async getUserTasks(userId: string): Promise<any[]> {
    const allTasks = await db.select().from(tasks);
    const userCompletedTasks = await db.select()
      .from(userTasks)
      .where(eq(userTasks.userId, userId));

    return allTasks.map(task => {
      const completed = userCompletedTasks.find(ut => ut.taskId === task.id);
      return {
        ...task,
        taskId: task.id,
        status: completed ? "completed" : "pending",
        completedAt: completed?.completedAt || null,
      };
    });
  }

  async completeTask(userId: string, taskId: string): Promise<{ success: boolean; message: string }> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) throw new Error("Task not found");

    const [existingUserTask] = await db.select()
      .from(userTasks)
      .where(and(eq(userTasks.userId, userId), eq(userTasks.taskId, taskId)));

    if (existingUserTask?.status === "completed") {
      return { success: false, message: "Task already completed" };
    }

    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    return db.transaction(async (tx) => {
      if (existingUserTask) {
        await tx.update(userTasks)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(userTasks.id, existingUserTask.id));
      } else {
        await tx.insert(userTasks).values({
          userId,
          taskId,
          status: "completed",
          completedAt: new Date(),
        });
      }

      const newXp = (user.xp || 0) + task.rewardXp;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

      await tx.update(users)
        .set({
          coins: (user.coins || 0) + task.rewardCoins,
          xp: newXp,
          level: newLevel,
        })
        .where(eq(users.id, userId));

      return { success: true, message: `Task completed! Gained ${task.rewardCoins} coins and ${task.rewardXp} XP!` };
    });
  }

  async rewardAdCredit(userId: string): Promise<{ success: boolean; balance: number; message: string }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    return db.transaction(async (tx) => {
      const newBalance = (user.coins || 0) + 5;
      
      await tx.insert(creditTransactions).values({
        userId,
        amount: 5,
        type: "rewarded_ad"
      });

      const [updated] = await tx.update(users)
        .set({ coins: newBalance })
        .where(eq(users.id, userId))
        .returning();

      return { success: true, balance: newBalance, message: "Earned 5 credits!" };
    });
  }

  async deductCredits(userId: string, amount: number, transactionType: string): Promise<{ success: boolean; balance: number }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    if ((user.coins || 0) < amount) throw new Error("Insufficient credits");

    return db.transaction(async (tx) => {
      const newBalance = (user.coins || 0) - amount;
      
      await tx.insert(creditTransactions).values({
        userId,
        amount: -amount,
        type: transactionType as any
      });

      const [updated] = await tx.update(users)
        .set({ coins: newBalance })
        .where(eq(users.id, userId))
        .returning();

      return { success: true, balance: newBalance };
    });
  }

  async getFeatureFlag(featureName: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.featureName, featureName));
    return flag;
  }

  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags);
  }

  async createFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag> {
    const [newFlag] = await db.insert(featureFlags).values(flag).returning();
    return newFlag;
  }

  async updateFeatureFlag(featureName: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const [updated] = await db.update(featureFlags)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(featureFlags.featureName, featureName))
      .returning();
    if (!updated) throw new Error("Feature flag not found");
    return updated;
  }
}

export const storage = new DatabaseStorage();
