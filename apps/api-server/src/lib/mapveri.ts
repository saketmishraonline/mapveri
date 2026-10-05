import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db, pinsTable, userAccountsTable, userActivitiesTable, usersTable, verificationsTable } from "@workspace/db";
import type { Request } from "express";
import { logger } from "./logger";
import { usernameBloomFilter } from "./bloom-filter";

const JWT_SECRET = process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "mapveri-development-secret";
const LEVEL_POINTS = { A: 3, B: 2, C: 1 } as const;

export type MapUser = typeof userAccountsTable.$inferSelect;
export type MapUserActivity = typeof userActivitiesTable.$inferSelect;

export function signUser(user: MapUser): string {
  return jwt.sign(
    { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, level: user.level, source: user.source },
    JWT_SECRET,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"] },
  );
}

export function readUser(req: Request): MapUser | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id?: number };
    if (!payload.id) return null;
    return null;
  } catch {
    return null;
  }
}

export async function getUserWithActivity(userId: number) {
  const [account] = await db
    .select()
    .from(userAccountsTable)
    .where(eq(userAccountsTable.id, userId))
    .limit(1);

  if (!account) return null;

  let [activity] = await db
    .select()
    .from(userActivitiesTable)
    .where(eq(userActivitiesTable.userId, userId))
    .limit(1);

  if (!activity) {
    [activity] = await db
      .insert(userActivitiesTable)
      .values({ userId })
      .onConflictDoNothing()
      .returning();
  }

  return { ...account, activity };
}

export async function userFromRequest(req: Request): Promise<MapUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    // 1. Check MapVeri signed JWT
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id?: number };
      if (payload.id) {
        const [user] = await db.select().from(userAccountsTable).where(eq(userAccountsTable.id, payload.id)).limit(1);
        if (user && !user.isBanned) return user;
      }
    } catch {
      // Fallback to Supabase token
    }

    // 2. Fallback: check Supabase decoded JWT
    const decoded = jwt.decode(token) as { sub?: string; email?: string } | null;
    if (decoded?.email) {
      const [user] = await db.select().from(userAccountsTable).where(ilike(userAccountsTable.email, decoded.email.trim())).limit(1);
      if (user && !user.isBanned) return user;
    }
    if (decoded?.sub) {
      const [user] = await db.select().from(userAccountsTable).where(eq(userAccountsTable.providerId, decoded.sub)).limit(1);
      if (user && !user.isBanned) return user;
    }

    return null;
  } catch {
    return null;
  }
}

export function publicUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    username: user.username || null,
    email: user.email,
    role: user.role,
    level: user.level as "A" | "B" | "C",
    source: user.source || "mapveri",
    pinsCreated: user.activity?.pinsCreated ?? user.pinsCreated ?? 0,
    verificationsCast: user.activity?.verificationsCast ?? user.verificationsCast ?? 0,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
    authProvider: user.authProvider || user.source || "local",
    providerId: user.providerId || null,
    avatarUrl: user.avatarUrl || null,
    isEmailVerified: user.isEmailVerified ?? false,
    oauthData: user.oauthData || null,
    needsUsername: !user.username,
  };
}

export function mapPin(row: {
  pin: typeof pinsTable.$inferSelect;
  creator: Pick<MapUser, "id" | "name" | "level">;
}) {
  return {
    id: row.pin.id,
    name: row.pin.name,
    description: row.pin.description,
    category: row.pin.category,
    lat: Number(row.pin.lat),
    lng: Number(row.pin.lng),
    status: row.pin.status as "unverified" | "community_verified" | "admin_verified" | "rejected",
    totalPoints: row.pin.totalPoints,
    createdByName: row.creator.name,
    createdByLevel: row.creator.level as "A" | "B" | "C",
    createdById: row.creator.id,
    createdAt: row.pin.createdAt,
  };
}

export async function fetchPins(status?: string, search?: string) {
  const filters = [];
  if (status && status !== "all") filters.push(eq(pinsTable.status, status));
  if (search) filters.push(ilike(pinsTable.name, `%${search}%`));
  const rows = await db
    .select({ pin: pinsTable, creator: { id: usersTable.id, name: usersTable.name, level: usersTable.level } })
    .from(pinsTable)
    .innerJoin(usersTable, eq(pinsTable.createdById, usersTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(pinsTable.createdAt));
  return rows.map(mapPin);
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function promoteUser(userId: number) {
  const userFull = await getUserWithActivity(userId);
  if (!userFull) return "C";

  const pins = userFull.activity?.pinsCreated ?? 0;
  const verifications = userFull.activity?.verificationsCast ?? 0;
  const nextLevel = pins >= 100 || verifications >= 250 ? "A" : pins >= 50 || verifications >= 100 ? "B" : "C";

  if (nextLevel !== userFull.level) {
    await db.update(userAccountsTable).set({ level: nextLevel }).where(eq(userAccountsTable.id, userId));
  }
  return nextLevel;
}

export async function verificationRows(pinId: number) {
  const rows = await db
    .select({ verification: verificationsTable, voter: { name: usersTable.name, level: usersTable.level } })
    .from(verificationsTable)
    .innerJoin(usersTable, eq(verificationsTable.userId, usersTable.id))
    .where(eq(verificationsTable.pinId, pinId))
    .orderBy(desc(verificationsTable.castAt));
  return rows.map((row) => ({
    id: row.verification.id,
    voterName: row.voter.name,
    voterLevel: row.voter.level as "A" | "B" | "C",
    vote: row.verification.vote as "confirm" | "dispute",
    pointsGiven: row.verification.pointsGiven,
    castAt: row.verification.castAt,
  }));
}

/**
 * Initializes the in-memory Bloom filter with all existing usernames from PostgreSQL
 */
export async function initializeBloomFilterFromDb() {
  try {
    const existingUsers = await db
      .select({ username: userAccountsTable.username })
      .from(userAccountsTable);

    for (const u of existingUsers) {
      if (u.username) {
        usernameBloomFilter.add(u.username);
      }
    }
    logger.info({ userCount: existingUsers.length }, "Bloom filter initialized with usernames from database");
  } catch (err: any) {
    logger.warn({ error: err.message }, "Could not load usernames into Bloom filter");
  }
}

export async function seedMapveri() {
  await initializeBloomFilterFromDb();

  const [{ value: existing }] = await db.select({ value: count(userAccountsTable.id) }).from(userAccountsTable);
  if (Number(existing) > 0) return;

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const userPasswordHash = await bcrypt.hash("user123", 10);

  // 1. Admin
  const [admin] = await db.insert(userAccountsTable).values({
    name: "admin",
    username: "admin_mapveri",
    email: "admin@mapveri.local",
    passwordHash: adminPasswordHash,
    role: "admin",
    level: "A",
    source: "mapveri",
    isEmailVerified: true,
  }).returning();
  await db.insert(userActivitiesTable).values({ userId: admin.id, pinsCreated: 0, verificationsCast: 0 });
  usernameBloomFilter.add("admin_mapveri");

  // 2. Saket
  const [saket] = await db.insert(userAccountsTable).values({
    name: "Saket Mishra",
    username: "saket",
    email: "saket@mapveri.local",
    passwordHash: userPasswordHash,
    role: "user",
    level: "A",
    source: "mapveri",
    isEmailVerified: true,
  }).returning();
  await db.insert(userActivitiesTable).values({ userId: saket.id, pinsCreated: 32, verificationsCast: 110 });
  usernameBloomFilter.add("saket");

  // 3. Madhukanth
  const [madhukanth] = await db.insert(userAccountsTable).values({
    name: "Madhukanth Poojary",
    username: "madhukanth",
    email: "madhukanth@mapveri.local",
    passwordHash: userPasswordHash,
    role: "user",
    level: "B",
    source: "mapveri",
    isEmailVerified: true,
  }).returning();
  await db.insert(userActivitiesTable).values({ userId: madhukanth.id, pinsCreated: 18, verificationsCast: 54 });
  usernameBloomFilter.add("madhukanth");

  // 4. Maitreya
  const [maitreya] = await db.insert(userAccountsTable).values({
    name: "Maitreya Mhatre",
    username: "maitreya",
    email: "maitreya@mapveri.local",
    passwordHash: userPasswordHash,
    role: "user",
    level: "B",
    source: "mapveri",
    isEmailVerified: true,
  }).returning();
  await db.insert(userActivitiesTable).values({ userId: maitreya.id, pinsCreated: 12, verificationsCast: 45 });
  usernameBloomFilter.add("maitreya");

  // 5. Aishwarya
  const [aishwarya] = await db.insert(userAccountsTable).values({
    name: "Aishwarya Nikam",
    username: "aishwarya",
    email: "aishwarya@mapveri.local",
    passwordHash: userPasswordHash,
    role: "user",
    level: "C",
    source: "mapveri",
    isEmailVerified: true,
  }).returning();
  await db.insert(userActivitiesTable).values({ userId: aishwarya.id, pinsCreated: 5, verificationsCast: 14 });
  usernameBloomFilter.add("aishwarya");

  const pins = [
    { name: "Harbor Roasters", description: "Small-batch coffee and quiet window seats.", category: "Restaurant", lat: "19.076", lng: "72.8777", status: "admin_verified", totalPoints: 9, createdById: saket.id },
    { name: "Community Water Point", description: "Public drinking water station near the south entrance.", category: "Landmark", lat: "19.0782", lng: "72.879", status: "community_verified", totalPoints: 6, createdById: madhukanth.id },
    { name: "Broken curb ramp", description: "Wheelchair access is blocked after rain.", category: "Road Issue", lat: "19.0746", lng: "72.8752", status: "unverified", totalPoints: 2, createdById: maitreya.id },
    { name: "Saturday makers market", description: "Local makers and growers gather here each weekend.", category: "Landmark", lat: "19.079", lng: "72.8747", status: "admin_verified", totalPoints: 12, createdById: saket.id },
  ];
  await db.insert(pinsTable).values(pins);
  logger.info({ adminId: admin.id, seededPins: pins.length, seededUsers: 4 }, "Seeded MapVeri database with user_account, user_activity, and pins");
}

export { LEVEL_POINTS };