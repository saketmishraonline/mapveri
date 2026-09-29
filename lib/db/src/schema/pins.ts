import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const pinsTable = pgTable("pins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("Other"),
  createdById: integer("created_by_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  lat: numeric("lat", { precision: 10, scale: 7 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 7 }).notNull(),
  status: text("status").notNull().default("unverified"),
  totalPoints: integer("total_points").notNull().default(0),
  adminReviewedBy: integer("admin_reviewed_by").references(() => usersTable.id),
  adminReviewedAt: timestamp("admin_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPinSchema = createInsertSchema(pinsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPin = z.infer<typeof insertPinSchema>;
export type Pin = typeof pinsTable.$inferSelect;