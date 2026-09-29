import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db, pinsTable, usersTable, verificationsTable } from "@workspace/db";
import type { Request } from "express";
import { logger } from "./logger";

const JWT_SECRET = process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "mapveri-development-secret";
const LEVEL_POINTS = { A: 3, B: 2, C: 1 } as const;

export type MapUser = typeof usersTable.$inferSelect;

export function signUser(user: MapUser): string {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, level: user.level },
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

export async function userFromRequest(req: Request): Promise<MapUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id?: number };
    if (!payload.id) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.id)).limit(1);
    if (!user || user.isBanned) return null;
    return user;
  } catch {
    return null;
  }
}

export function publicUser(user: MapUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    level: user.level as "A" | "B" | "C",
    pinsCreated: user.pinsCreated,
    verificationsCast: user.verificationsCast,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
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
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return "C";
  const nextLevel = user.pinsCreated >= 100 || user.verificationsCast >= 250 ? "A" : user.pinsCreated >= 50 || user.verificationsCast >= 100 ? "B" : "C";
  if (nextLevel !== user.level) await db.update(usersTable).set({ level: nextLevel }).where(eq(usersTable.id, userId));
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

export async function seedMapveri() {
  const [{ value: existing }] = await db.select({ value: count(usersTable.id) }).from(usersTable);
  if (Number(existing) > 0) return;
  const passwordHash = await bcrypt.hash("demo-password", 10);
  const [admin] = await db.insert(usersTable).values({
    name: "MapVeri Admin",
    email: "admin@mapveri.local",
    passwordHash,
    role: "admin",
    level: "A",
  }).returning();
  const [maya] = await db.insert(usersTable).values({
    name: "Maya Chen",
    email: "maya@mapveri.local",
    passwordHash,
    role: "user",
    level: "B",
    pinsCreated: 14,
    verificationsCast: 68,
  }).returning();
  const pins = [
    { name: "Harbor Roasters", description: "Small-batch coffee and quiet window seats.", category: "Restaurant", lat: "19.076", lng: "72.8777", status: "admin_verified", totalPoints: 9, createdById: maya.id },
    { name: "Community Water Point", description: "Public drinking water station near the south entrance.", category: "Landmark", lat: "19.0782", lng: "72.879", status: "community_verified", totalPoints: 6, createdById: maya.id },
    { name: "Broken curb ramp", description: "Wheelchair access is blocked after rain.", category: "Road Issue", lat: "19.0746", lng: "72.8752", status: "unverified", totalPoints: 2, createdById: maya.id },
    { name: "Saturday makers market", description: "Local makers and growers gather here each weekend.", category: "Landmark", lat: "19.079", lng: "72.8747", status: "admin_verified", totalPoints: 12, createdById: maya.id },
  ];
  await db.insert(pinsTable).values(pins);
  logger.info({ adminId: admin.id, seededPins: pins.length }, "Seeded MapVeri demo data");
}

export { LEVEL_POINTS };