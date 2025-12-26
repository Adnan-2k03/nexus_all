import { pgTable, varchar, timestamp, text, integer, jsonb, boolean, pgEnum, index, unique, serial, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const genderEnum = pgEnum("gender", ["male", "female", "other", "prefer_not_to_say"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "pro", "gold"]);
export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "match_posting",
  "connection_request",
  "portfolio_boost",
  "voice_channel_purchase",
  "subscription_charge",
  "rewarded_ad",
  "admin_credit",
  "refund"
]);
export const groupRoleEnum = pgEnum("group_role", ["owner", "admin", "member"]);
export const translationStatusEnum = pgEnum("translation_status", ["pending", "completed", "failed"]);

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleId: varchar("google_id").unique(),
  email: varchar("email").unique(),
  phoneNumber: varchar("phone_number").unique(),
  phoneVerified: boolean("phone_verified").default(false),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  gamertag: varchar("gamertag").unique().notNull(),
  bio: text("bio"),
  location: varchar("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  age: integer("age"),
  gender: genderEnum("gender"),
  language: varchar("language"),
  preferredGames: text("preferred_games").array(),
  showMutualGames: varchar("show_mutual_games").default("everyone"),
  showMutualFriends: varchar("show_mutual_friends").default("everyone"),
  showMutualHobbies: varchar("show_mutual_hobbies").default("everyone"),
  voiceOverlayEnabled: boolean("voice_overlay_enabled").default(false),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("free"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  connectionRequestsUsedToday: integer("connection_requests_used_today").default(0),
  lastConnectionRequestReset: timestamp("last_connection_request_reset").defaultNow(),
  adRevenueEarned: integer("ad_revenue_earned").default(0),
  coins: integer("coins").default(100),
  xp: integer("xp").default(0),
  level: integer("level").default(1),
  dailyRewardLastClaimed: timestamp("daily_reward_last_claimed"),
  gameProfiles: jsonb("game_profiles").default({}),
  isAdmin: boolean("is_admin").default(false),
  rewardsOverlayEnabled: boolean("rewards_overlay_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  gameName: varchar("game_name").notNull(),
  prizePool: integer("prize_pool").notNull(),
  entryFee: integer("entry_fee").default(0),
  maxParticipants: integer("max_participants").notNull(),
  startTime: timestamp("start_time"),
  playersPerTeam: integer("players_per_team").default(1),
  status: varchar("status").notNull().default("upcoming"),
  description: text("description"), // Admin Description field
  roadmapImageUrl: varchar("roadmap_image_url"), // Roadmap photo URL
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournamentTeams = pgTable("tournament_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  leaderId: varchar("leader_id").notNull().references(() => users.id),
  name: varchar("name"), // For saved layouts
  status: varchar("status").notNull().default("pending"), // pending until all members accept
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournamentTeamMembers = pgTable("tournament_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => tournamentTeams.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("unique_tournament_user").on(table.teamId, table.userId),
]);

export const userSettings = pgTable("user_settings", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  autoAcceptFrom: text("auto_accept_from").array().default(sql`'{}'::text[]`), // List of user IDs to auto-accept invites from
});

export const matchHistory = pgTable("match_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  tournamentName: varchar("tournament_name").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  highestRound: varchar("highest_round").notNull(), // Winner, Semi-Finalist, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamLayouts = pgTable("team_layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  gameName: varchar("game_name").notNull(),
  memberIds: text("member_ids").array().notNull(), // NexusMatch IDs of teammates
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournamentParticipants = pgTable("tournament_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  gameDetails: jsonb("game_details"),
  status: varchar("status").notNull().default("registered"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tournament_participants_tournament").on(table.tournamentId),
  index("idx_tournament_participants_user").on(table.userId),
]);

export const tournamentMessages = pgTable("tournament_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  isAnnouncement: boolean("is_announcement").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tournament_messages_tournament").on(table.tournamentId),
]);

export const matchRequests = pgTable("match_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  game: varchar("game").notNull(),
  mode: varchar("mode").notNull(),
  platform: varchar("platform").notNull(),
  language: varchar("language").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hobbies = pgTable("hobbies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  link: varchar("link"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  type: varchar("type").notNull(), // daily, weekly
  rewardCoins: integer("reward_coins").notNull(),
  rewardXp: integer("reward_xp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userTasks = pgTable("user_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("pending"), // pending, completed
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type UserTask = typeof userTasks.$inferSelect;
export type InsertUserTask = typeof userTasks.$inferInsert;

export type Hobby = typeof hobbies.$inferSelect;
export type InsertHobby = typeof hobbies.$inferInsert;
export const insertHobbySchema = createInsertSchema(hobbies).omit({ id: true, userId: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type InsertTournamentParticipant = typeof tournamentParticipants.$inferInsert;
export type TournamentParticipantWithUser = TournamentParticipant & {
  gamertag: string | null;
  profileImageUrl: string | null;
};
export const insertTournamentSchema = createInsertSchema(tournaments)
  .omit({ id: true, createdBy: true, createdAt: true })
  .extend({
    startTime: z.string().nullish().transform((val) => val ? new Date(val) : null),
    maxParticipants: z.number().int().min(2),
    roadmapImageUrl: z.string().optional()
  });
export const insertMatchRequestSchema = createInsertSchema(matchRequests).omit({ id: true, userId: true, createdAt: true });

export const sendPhoneCodeSchema = z.object({
  phoneNumber: z.string().min(10)
});

export const verifyPhoneCodeSchema = z.object({
  phoneNumber: z.string().min(10),
  code: z.string().length(6)
});

export const phoneRegisterSchema = z.object({
  phoneNumber: z.string().min(10),
  gamertag: z.string().min(3)
});

export const registerUserSchema = z.object({
  gamertag: z.string().min(3),
  email: z.string().email().optional()
});

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: creditTransactionTypeEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
