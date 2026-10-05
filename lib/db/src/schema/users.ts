import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// 1. User Account: core identity and credentials
export const userAccountsTable = pgTable("user_account", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull().default(""),
  role: text("role").notNull().default("user"),
  level: text("level").notNull().default("C"),
  source: text("source").notNull().default("mapveri"), // "mapveri" | "google" | "outlook" | "zoho"
  authProvider: text("auth_provider").notNull().default("local"),
  providerId: text("provider_id"),
  avatarUrl: text("avatar_url"),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  oauthData: text("oauth_data"),
  isBanned: boolean("is_banned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 2. User Activity: metrics, pins, verifications, activity timestamps
export const userActivitiesTable = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userAccountsTable.id, { onDelete: "cascade" }).unique(),
  pinsCreated: integer("pins_created").notNull().default(0),
  verificationsCast: integer("verifications_cast").notNull().default(0),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Backward compatibility alias for existing references
export const usersTable = userAccountsTable;

export const insertUserAccountSchema = createInsertSchema(userAccountsTable).omit({
  id: true,
  createdAt: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivitiesTable).omit({
  id: true,
  updatedAt: true,
});

export const insertUserSchema = insertUserAccountSchema;

export type UserAccount = typeof userAccountsTable.$inferSelect;
export type UserActivity = typeof userActivitiesTable.$inferSelect;
export type User = UserAccount & { pinsCreated?: number; verificationsCast?: number };
export type InsertUser = z.infer<typeof insertUserAccountSchema>;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;