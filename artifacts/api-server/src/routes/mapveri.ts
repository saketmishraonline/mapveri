import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import {
  GetAdminStatsResponse,
  ApprovePinParams,
  CreatePinBody,
  GetAdminPinsQueryParams,
  GetAdminUsersQueryParams,
  GetMeResponse,
  GetPinParams,
  GetProfileResponse,
  LoginBody,
  LoginResponse,
  RegisterBody,
  RegisterResponse,
  VerifyPinBody,
  VerifyPinParams,
} from "@workspace/api-zod";
import { db, pinsTable, usersTable, verificationsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  LEVEL_POINTS,
  distanceMeters,
  fetchPins,
  mapPin,
  promoteUser,
  publicUser,
  signUser,
  userFromRequest,
  verificationRows,
} from "../lib/mapveri";

const router: IRouter = Router();

async function requireUser(req: Parameters<IRouter["get"]>[1] extends never ? never : any, res: any) {
  const user = await userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}

async function requireAdmin(req: any, res: any) {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 10),
  }).returning();
  res.status(201).json(RegisterResponse.parse({ token: signUser(user), user: publicUser(user) }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email.toLowerCase())).limit(1);
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (user.isBanned) {
    res.status(403).json({ error: "Your account has been banned" });
    return;
  }
  res.json(LoginResponse.parse({ token: signUser(user), user: publicUser(user) }));
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;
  res.json(GetMeResponse.parse(publicUser(user)));
});

router.get("/profile", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;
  const recentPins = (await fetchPins()).filter((pin) => pin.createdById === user.id).slice(0, 5);
  res.json(GetProfileResponse.parse({ user: publicUser(user), recentPins }));
});

router.get("/pins", async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const pins = await fetchPins(status);
  const bbox = typeof req.query.bbox === "string" ? req.query.bbox.split(",").map(Number) : null;
  const filtered = bbox?.length === 4 && bbox.every(Number.isFinite)
    ? pins.filter((pin) => pin.lng >= bbox[0] && pin.lng <= bbox[2] && pin.lat >= bbox[1] && pin.lat <= bbox[3])
    : pins;
  const viewer = await userFromRequest(req);
  const canSeeRejected = viewer?.role === "admin";
  res.json(filtered.filter((pin) => canSeeRejected || pin.status !== "rejected"));
});

router.post("/pins", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;
  const parsed = CreatePinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [pin] = await db.insert(pinsTable).values({
    ...parsed.data,
    description: parsed.data.description ?? "",
    createdById: user.id,
    lat: String(parsed.data.lat),
    lng: String(parsed.data.lng),
  }).returning();
  await db.update(usersTable).set({ pinsCreated: user.pinsCreated + 1 }).where(eq(usersTable.id, user.id));
  await promoteUser(user.id);
  const created = mapPin({ pin, creator: { id: user.id, name: user.name, level: user.level } });
  res.status(201).json(created);
});

router.get("/pins/nearby", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const pins = await fetchPins("unverified");
  const nearby = pins
    .filter((pin) => pin.createdById !== user.id)
    .map((pin) => ({ ...pin, distanceMeters: distanceMeters(lat, lng, pin.lat, pin.lng) }))
    .filter((pin) => pin.distanceMeters <= 300);
  res.json(nearby);
});

router.get("/pins/:id", async (req, res): Promise<void> => {
  const parsed = GetPinParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .select({ pin: pinsTable, creator: { id: usersTable.id, name: usersTable.name, level: usersTable.level } })
    .from(pinsTable)
    .innerJoin(usersTable, eq(pinsTable.createdById, usersTable.id))
    .where(eq(pinsTable.id, parsed.data.id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Pin not found" });
    return;
  }
  res.json({ ...mapPin(row), verifications: await verificationRows(parsed.data.id) });
});

router.post("/pins/:id/verify", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;
  const params = VerifyPinParams.safeParse(req.params);
  const body = VerifyPinBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Vote must be confirm or dispute" });
    return;
  }
  const [pin] = await db.select().from(pinsTable).where(eq(pinsTable.id, params.data.id)).limit(1);
  if (!pin || pin.status === "admin_verified" || pin.status === "rejected") {
    res.status(400).json({ error: "This pin is no longer open for verification" });
    return;
  }
  if (pin.createdById === user.id) {
    res.status(400).json({ error: "Cannot verify your own pin" });
    return;
  }
  const [alreadyVoted] = await db.select().from(verificationsTable).where(and(eq(verificationsTable.pinId, pin.id), eq(verificationsTable.userId, user.id))).limit(1);
  if (alreadyVoted) {
    res.status(409).json({ error: "Already voted on this pin" });
    return;
  }
  const points = LEVEL_POINTS[user.level as keyof typeof LEVEL_POINTS] ?? 1;
  await db.insert(verificationsTable).values({ pinId: pin.id, userId: user.id, vote: body.data.vote, pointsGiven: points });
  const nextPoints = body.data.vote === "confirm" ? pin.totalPoints + points : pin.totalPoints;
  const nextStatus = nextPoints >= 6 && pin.status === "unverified" ? "community_verified" : pin.status;
  await db.update(pinsTable).set({ totalPoints: nextPoints, status: nextStatus }).where(eq(pinsTable.id, pin.id));
  await db.update(usersTable).set({ verificationsCast: user.verificationsCast + 1 }).where(eq(usersTable.id, user.id));
  const newLevel = await promoteUser(user.id);
  res.json({ newPoints: nextPoints, newStatus: nextStatus, newLevel });
});

router.get("/admin/stats", async (req, res): Promise<void> => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const [totalPins] = await db.select({ value: count(pinsTable.id) }).from(pinsTable);
  const [adminVerified] = await db.select({ value: count(pinsTable.id) }).from(pinsTable).where(eq(pinsTable.status, "admin_verified"));
  const [pendingReview] = await db.select({ value: count(pinsTable.id) }).from(pinsTable).where(eq(pinsTable.status, "community_verified"));
  const [rejected] = await db.select({ value: count(pinsTable.id) }).from(pinsTable).where(eq(pinsTable.status, "rejected"));
  const [totalUsers] = await db.select({ value: count(usersTable.id) }).from(usersTable);
  const [levelA] = await db.select({ value: count(usersTable.id) }).from(usersTable).where(eq(usersTable.level, "A"));
  const [levelB] = await db.select({ value: count(usersTable.id) }).from(usersTable).where(eq(usersTable.level, "B"));
  const [levelC] = await db.select({ value: count(usersTable.id) }).from(usersTable).where(eq(usersTable.level, "C"));
  const recentPins = (await fetchPins()).slice(0, 10);
  res.json(GetAdminStatsResponse.parse({
    totalPins: Number(totalPins.value),
    adminVerified: Number(adminVerified.value),
    pendingReview: Number(pendingReview.value),
    rejected: Number(rejected.value),
    totalUsers: Number(totalUsers.value),
    levelA: Number(levelA.value),
    levelB: Number(levelB.value),
    levelC: Number(levelC.value),
    recentPins,
  }));
});

router.get("/admin/pins", async (req, res): Promise<void> => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const parsed = GetAdminPinsQueryParams.parse(req.query);
  const allPins = await fetchPins(parsed.status, parsed.search);
  const page = parsed.page ?? 1;
  const limit = parsed.limit ?? 10;
  res.json({ pins: allPins.slice((page - 1) * limit, page * limit), total: allPins.length, page, limit });
});

async function reviewPin(req: any, res: any, status: "admin_verified" | "rejected") {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const parsed = ApprovePinParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid pin id" });
    return;
  }
  const [pin] = await db.update(pinsTable).set({ status, adminReviewedBy: admin.id, adminReviewedAt: new Date() }).where(eq(pinsTable.id, parsed.data.id)).returning();
  if (!pin) {
    res.status(404).json({ error: "Pin not found" });
    return;
  }
  const [row] = await db.select({ pin: pinsTable, creator: { id: usersTable.id, name: usersTable.name, level: usersTable.level } }).from(pinsTable).innerJoin(usersTable, eq(pinsTable.createdById, usersTable.id)).where(eq(pinsTable.id, pin.id)).limit(1);
  res.json(mapPin(row));
}

router.patch("/admin/pins/:id/approve", (req, res) => reviewPin(req, res, "admin_verified"));
router.patch("/admin/pins/:id/reject", (req, res) => reviewPin(req, res, "rejected"));

router.get("/admin/users", async (req, res): Promise<void> => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const parsed = GetAdminUsersQueryParams.parse(req.query);
  const filters = [];
  if (parsed.level && parsed.level !== "all") filters.push(eq(usersTable.level, parsed.level));
  if (parsed.search) filters.push(or(ilike(usersTable.name, `%${parsed.search}%`), ilike(usersTable.email, `%${parsed.search}%`)));
  const users = await db.select().from(usersTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(usersTable.createdAt));
  res.json(users.map(publicUser));
});

router.patch("/admin/users/:id/level", async (req, res): Promise<void> => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const id = Number(req.params.id);
  const level = req.body?.level;
  if (!Number.isInteger(id) || !["A", "B", "C"].includes(level)) {
    res.status(400).json({ error: "Level must be A, B, or C" });
    return;
  }
  const [user] = await db.update(usersTable).set({ level }).where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(publicUser(user));
});

router.patch("/admin/users/:id/ban", async (req, res): Promise<void> => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const id = Number(req.params.id);
  const [current] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!current) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [user] = await db.update(usersTable).set({ isBanned: !current.isBanned }).where(eq(usersTable.id, id)).returning();
  res.json(publicUser(user));
});

export default router;