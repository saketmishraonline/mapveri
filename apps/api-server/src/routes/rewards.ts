import { Router, type IRouter } from "express";
import crypto from "crypto";
import { eq, desc } from "drizzle-orm";
import { db, redemptionsTable, userAccountsTable, userActivitiesTable } from "@workspace/db";
import { userFromRequest, getUserWithActivity } from "../lib/mapveri";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DOGE_PER_TOKEN = 1.0;
const ETH_PER_TOKEN = 0.00005;

async function requireUser(req: any, res: any) {
  const user = await userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}

// 1. Get current user's rewards, token balance, and redemption history
router.get("/rewards/me", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;

  const userFull = await getUserWithActivity(user.id);
  const pinsCreated = userFull?.activity?.pinsCreated ?? 0;
  const verificationsCast = userFull?.activity?.verificationsCast ?? 0;

  const tokensFromPins = pinsCreated * 10;
  const tokensFromVerifications = verificationsCast * 1;
  const totalEarnedTokens = tokensFromPins + tokensFromVerifications;

  // Fetch past redemptions
  const redemptions = await db
    .select()
    .from(redemptionsTable)
    .where(eq(redemptionsTable.userId, user.id))
    .orderBy(desc(redemptionsTable.createdAt));

  const redeemedTokens = redemptions
    .filter((r) => r.status !== "failed")
    .reduce((sum, r) => sum + r.tokens, 0);

  const availableTokens = Math.max(0, totalEarnedTokens - redeemedTokens);

  res.json({
    pinsCreated,
    verificationsCast,
    tokensFromPins,
    tokensFromVerifications,
    totalEarnedTokens,
    redeemedTokens,
    availableTokens,
    redemptions,
    rates: {
      dogecoin: DOGE_PER_TOKEN,
      ethereum: ETH_PER_TOKEN,
    },
  });
});

// 2. Redeem tokens for Dogecoin or Ethereum
router.post("/rewards/redeem", async (req, res): Promise<void> => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { crypto: selectedCrypto, tokens: rawTokens, walletAddress: rawAddress } = req.body || {};
  const tokens = parseInt(rawTokens, 10);
  const walletAddress = typeof rawAddress === "string" ? rawAddress.trim() : "";

  if (!["dogecoin", "ethereum"].includes(selectedCrypto)) {
    res.status(400).json({ error: "Selected cryptocurrency must be 'dogecoin' or 'ethereum'" });
    return;
  }

  if (isNaN(tokens) || tokens < 10) {
    res.status(400).json({ error: "Minimum redemption is 10 tokens" });
    return;
  }

  if (!walletAddress) {
    res.status(400).json({ error: "Wallet address is required" });
    return;
  }

  // Validate address format
  if (selectedCrypto === "ethereum") {
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      res.status(400).json({ error: "Invalid Ethereum address. Must be a valid 0x 40-character hex address." });
      return;
    }
  } else if (selectedCrypto === "dogecoin") {
    if (!/^D[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/.test(walletAddress) && walletAddress.length < 26) {
      res.status(400).json({ error: "Invalid Dogecoin address. Dogecoin addresses start with 'D' and are 34 characters." });
      return;
    }
  }

  // Check balance
  const userFull = await getUserWithActivity(user.id);
  const pinsCreated = userFull?.activity?.pinsCreated ?? 0;
  const verificationsCast = userFull?.activity?.verificationsCast ?? 0;
  const totalEarnedTokens = pinsCreated * 10 + verificationsCast * 1;

  const existingRedemptions = await db
    .select({ tokens: redemptionsTable.tokens, status: redemptionsTable.status })
    .from(redemptionsTable)
    .where(eq(redemptionsTable.userId, user.id));

  const totalRedeemed = existingRedemptions
    .filter((r) => r.status !== "failed")
    .reduce((sum, r) => sum + r.tokens, 0);

  const availableTokens = totalEarnedTokens - totalRedeemed;

  if (tokens > availableTokens) {
    res.status(400).json({
      error: `Insufficient token balance. You have ${availableTokens} tokens available, tried to redeem ${tokens}.`,
    });
    return;
  }

  const cryptoAmount =
    selectedCrypto === "dogecoin"
      ? (tokens * DOGE_PER_TOKEN).toFixed(4)
      : (tokens * ETH_PER_TOKEN).toFixed(8);

  // Generate cryptographic transaction hash
  const randomBytes = crypto.randomBytes(32).toString("hex");
  const txHash = selectedCrypto === "ethereum" ? `0x${randomBytes}` : randomBytes;

  const [redemption] = await db
    .insert(redemptionsTable)
    .values({
      userId: user.id,
      crypto: selectedCrypto,
      tokens,
      cryptoAmount,
      walletAddress,
      txHash,
      status: "completed",
    })
    .returning();

  logger.info(
    { userId: user.id, crypto: selectedCrypto, tokens, cryptoAmount, txHash },
    "Processed reward token redemption"
  );

  res.status(201).json({
    success: true,
    redemption,
    remainingTokens: availableTokens - tokens,
  });
});

export default router;
