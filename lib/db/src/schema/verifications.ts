import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pinsTable } from "./pins";
import { usersTable } from "./users";

export const verificationsTable = pgTable(
  "verifications",
  {
    id: serial("id").primaryKey(),
    pinId: integer("pin_id").notNull().references(() => pinsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    vote: text("vote").notNull(),
    pointsGiven: integer("points_given").notNull(),
    castAt: timestamp("cast_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pinUserUnique: unique("verifications_pin_user_unique").on(table.pinId, table.userId),
  }),
);

export const insertVerificationSchema = createInsertSchema(verificationsTable).omit({
  id: true,
  castAt: true,
});
export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type Verification = typeof verificationsTable.$inferSelect;