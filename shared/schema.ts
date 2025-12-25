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
  dailyRewardLastClaimed: timestamp("daily_reward_last_claimed"),
  gameProfiles: jsonb("game_profiles").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  gameName: varchar("game_name").notNull(),
  prizePool: integer("prize_pool").notNull(),
  entryFee: integer("entry_fee").default(0),
  maxParticipants: integer("max_participants").notNull(),
  status: varchar("status").notNull().default("upcoming"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
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

export type Hobby = typeof hobbies.$inferSelect;
export type InsertHobby = typeof hobbies.$inferInsert;
export const insertHobbySchema = createInsertSchema(hobbies).omit({ id: true, userId: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type InsertTournamentParticipant = typeof tournamentParticipants.$inferInsert;
export type TournamentParticipantWithUser = TournamentParticipant & {
  gamertag: string | null;
  profileImageUrl: string | null;
};
export const insertTournamentSchema = createInsertSchema(tournaments).omit({ id: true, createdBy: true, createdAt: true });
export const insertMatchRequestSchema = createInsertSchema(matchRequests).omit({ id: true, userId: true, createdAt: true });
