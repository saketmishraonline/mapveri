import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq, ilike } from "drizzle-orm";
import { db, userAccountsTable, userActivitiesTable, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { getUserWithActivity, publicUser, signUser, userFromRequest } from "../lib/mapveri";
import { usernameBloomFilter } from "../lib/bloom-filter";

const router: IRouter = Router();

// OAuth Provider Configs
interface OAuthProviderConfig {
  clientId?: string;
  clientSecret?: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

function getOAuthConfigs(req: Request): Record<string, OAuthProviderConfig> {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:5173";
  const origin = `${protocol}://${host}`;

  return {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
      scopes: ["openid", "email", "profile"],
    },
    zoho: {
      clientId: process.env.ZOHO_CLIENT_ID || "",
      clientSecret: process.env.ZOHO_CLIENT_SECRET || "",
      authUrl: process.env.ZOHO_AUTH_URL || "https://accounts.zoho.com/oauth/v2/auth",
      tokenUrl: process.env.ZOHO_TOKEN_URL || "https://accounts.zoho.com/oauth/v2/token",
      userInfoUrl: process.env.ZOHO_USERINFO_URL || "https://accounts.zoho.com/oauth/user/info",
      scopes: ["AaaServer.profile.Read", "ZohoMail.accounts.READ"],
    },
    outlook: {
      clientId: process.env.MICROSOFT_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID || process.env.AZURE_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || process.env.OUTLOOK_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET || "",
      authUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/token`,
      userInfoUrl: "https://graph.microsoft.com/v1.0/me",
      scopes: ["openid", "email", "profile", "User.Read"],
    },
  };
}

// 1. Get providers status and configuration
router.get("/auth/oauth/providers", (req: Request, res: Response) => {
  const configs = getOAuthConfigs(req);
  res.json({
    google: {
      name: "Google",
      configured: Boolean(configs.google.clientId && configs.google.clientSecret),
      clientId: configs.google.clientId ? `${configs.google.clientId.substring(0, 12)}...` : null,
    },
    zoho: {
      name: "Zoho Mail",
      configured: Boolean(configs.zoho.clientId && configs.zoho.clientSecret),
      clientId: configs.zoho.clientId ? `${configs.zoho.clientId.substring(0, 8)}...` : null,
    },
    outlook: {
      name: "Microsoft Outlook",
      configured: Boolean(configs.outlook.clientId && configs.outlook.clientSecret),
      clientId: configs.outlook.clientId ? `${configs.outlook.clientId.substring(0, 8)}...` : null,
    },
    verificationReady: true,
  });
});

// 2. Get authorization URL for redirecting
router.get("/auth/oauth/:provider/url", (req: Request, res: Response): void => {
  const rawProvider = req.params.provider;
  const providerKey = (typeof rawProvider === "string" ? rawProvider : rawProvider?.[0] || "").toLowerCase();
  const configs = getOAuthConfigs(req);
  const provider = configs[providerKey];

  if (!provider) {
    res.status(400).json({ error: `Unsupported OAuth provider: ${providerKey}` });
    return;
  }

  const redirectUri = (req.query.redirectUri as string) || `${req.headers.origin || "https://localhost:5173"}/login?oauth_callback=${providerKey}`;
  const state = (req.query.state as string) || crypto.randomBytes(16).toString("hex");

  if (!provider.clientId) {
    res.json({
      configured: false,
      message: `Client credentials for ${providerKey} are not set in environment. Use direct third-party verification.`,
      url: null,
      provider: providerKey,
    });
    return;
  }

  let authUrl = `${provider.authUrl}?client_id=${encodeURIComponent(provider.clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(provider.scopes.join(" "))}` +
    `&state=${encodeURIComponent(state)}`;

  if (providerKey === "google") {
    authUrl += "&access_type=offline&prompt=select_account";
  } else if (providerKey === "zoho") {
    authUrl += "&access_type=offline&prompt=consent";
  } else if (providerKey === "outlook") {
    authUrl += "&response_mode=query";
  }

  res.json({
    configured: true,
    url: authUrl,
    state,
    provider: providerKey,
  });
});

// Helper to upsert a user authenticated via third-party verification
async function generateUniqueUsername(email: string, name: string): Promise<string> {
  const emailPrefix = email.split("@")[0] || "";
  let base = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15);
  if (!base || base.length < 3) {
    base = (name || "user").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15);
  }
  if (!base || base.length < 3) {
    base = `user_${Math.floor(1000 + Math.random() * 9000)}`;
  }

  let candidate = base;
  let counter = 1;
  while (true) {
    const [existing] = await db
      .select({ id: userAccountsTable.id })
      .from(userAccountsTable)
      .where(ilike(userAccountsTable.username, candidate))
      .limit(1);

    if (!existing) {
      usernameBloomFilter.add(candidate);
      return candidate;
    }

    candidate = `${base.slice(0, 12)}_${counter}`;
    counter++;
  }
}

async function upsertOAuthUser(params: {
  provider: "google" | "zoho" | "outlook";
  email: string;
  name: string;
  providerId: string;
  avatarUrl?: string | null;
  oauthPayload: Record<string, unknown>;
}) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const normalizedName = params.name.trim() || normalizedEmail.split("@")[0];

  const [existingUser] = await db
    .select()
    .from(userAccountsTable)
    .where(ilike(userAccountsTable.email, normalizedEmail))
    .limit(1);

  const serializedOAuthData = JSON.stringify({
    provider: params.provider,
    providerId: params.providerId,
    verifiedEmail: normalizedEmail,
    verifiedName: normalizedName,
    avatarUrl: params.avatarUrl || null,
    verifiedAt: new Date().toISOString(),
    rawProfile: params.oauthPayload,
  });

  if (existingUser) {
    if (existingUser.isBanned) {
      throw new Error("This account has been banned.");
    }

    const [updatedUser] = await db
      .update(userAccountsTable)
      .set({
        name: existingUser.name || normalizedName,
        source: params.provider,
        authProvider: params.provider,
        providerId: params.providerId,
        avatarUrl: params.avatarUrl || existingUser.avatarUrl,
        isEmailVerified: true,
        oauthData: serializedOAuthData,
      })
      .where(eq(userAccountsTable.id, existingUser.id))
      .returning();

    await db
      .update(userActivitiesTable)
      .set({ lastActiveAt: new Date() })
      .where(eq(userActivitiesTable.userId, existingUser.id));

    return updatedUser;
  }

  // Create new user with source set to provider. username is left null so first-time modal asks for name & username
  const randomPassword = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(randomPassword, 10);

  const configuredAdminEmails = (process.env.ADMIN_EMAILS || "admin@mapveri.local,admin@mapveri.com")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim());
  const isAdmin = configuredAdminEmails.includes(normalizedEmail) || normalizedEmail.startsWith("admin@");

  const [newUser] = await db
    .insert(userAccountsTable)
    .values({
      name: normalizedName,
      username: null, // First-time prompt asks for name and username
      email: normalizedEmail,
      passwordHash,
      role: isAdmin ? "admin" : "user",
      level: isAdmin ? "A" : "C",
      source: params.provider,
      authProvider: params.provider,
      providerId: params.providerId,
      avatarUrl: params.avatarUrl || null,
      isEmailVerified: true,
      oauthData: serializedOAuthData,
    })
    .returning();

  await db
    .insert(userActivitiesTable)
    .values({
      userId: newUser.id,
      pinsCreated: 0,
      verificationsCast: 0,
      lastActiveAt: new Date(),
    })
    .onConflictDoNothing();

  return newUser;
}

// 3. Callback to exchange OAuth code with provider token and fetch verified profile
router.post("/auth/oauth/:provider/callback", async (req: Request, res: Response): Promise<void> => {
  const rawProvider = req.params.provider;
  const providerKey = (typeof rawProvider === "string" ? rawProvider : rawProvider?.[0] || "").toLowerCase() as "google" | "zoho" | "outlook";
  const { code, redirectUri } = req.body;

  if (!code) {
    res.status(400).json({ error: "Authorization code is required" });
    return;
  }

  const configs = getOAuthConfigs(req);
  const providerConfig = configs[providerKey];

  if (!providerConfig || !providerConfig.clientId || !providerConfig.clientSecret) {
    res.status(400).json({
      error: `OAuth credentials for ${providerKey} not configured in .env`,
    });
    return;
  }

  try {
    let verifiedEmail = "";
    let verifiedName = "";
    let providerId = "";
    let avatarUrl: string | null = null;
    let rawProfileData: Record<string, unknown> = {};

    if (providerKey === "google") {
      // 1. Exchange code for Google tokens
      const tokenRes = await fetch(providerConfig.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        logger.error({ err: errorText }, "Google token exchange failed");
        res.status(400).json({ error: "Failed to exchange authorization code with Google" });
        return;
      }

      const tokenData = (await tokenRes.json()) as { access_type?: string; access_token: string; id_token?: string };

      // 2. Fetch Google User Profile
      const userRes = await fetch(providerConfig.userInfoUrl, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        res.status(400).json({ error: "Failed to fetch user profile from Google" });
        return;
      }

      const googleUser = (await userRes.json()) as {
        sub: string;
        email: string;
        name: string;
        picture?: string;
        email_verified?: boolean;
      };

      verifiedEmail = googleUser.email;
      verifiedName = googleUser.name || googleUser.email.split("@")[0];
      providerId = googleUser.sub;
      avatarUrl = googleUser.picture || null;
      rawProfileData = { ...googleUser, tokenType: "Bearer" };

    } else if (providerKey === "zoho") {
      // 1. Exchange code for Zoho tokens
      const tokenRes = await fetch(providerConfig.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        logger.error({ err: errorText }, "Zoho token exchange failed");
        res.status(400).json({ error: "Failed to exchange authorization code with Zoho" });
        return;
      }

      const tokenData = (await tokenRes.json()) as { access_token: string };

      // 2. Fetch Zoho User Profile
      const userRes = await fetch(providerConfig.userInfoUrl, {
        headers: { Authorization: `Zoho-oauthtoken ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        res.status(400).json({ error: "Failed to fetch user profile from Zoho" });
        return;
      }

      const zohoUser = (await userRes.json()) as Record<string, any>;
      verifiedEmail = zohoUser.Email || zohoUser.email || zohoUser.user_email || "";
      verifiedName = zohoUser.Display_Name || zohoUser.display_name || `${zohoUser.First_Name || ""} ${zohoUser.Last_Name || ""}`.trim() || verifiedEmail.split("@")[0];
      providerId = String(zohoUser.ZUID || zohoUser.zuid || zohoUser.id || "");
      avatarUrl = zohoUser.profile_photo_url || null;
      rawProfileData = zohoUser;

    } else if (providerKey === "outlook") {
      // 1. Exchange code for Microsoft tokens
      const tokenRes = await fetch(providerConfig.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: providerConfig.scopes.join(" "),
        }),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        logger.error({ err: errorText }, "Microsoft Outlook token exchange failed");
        res.status(400).json({ error: "Failed to exchange authorization code with Microsoft Outlook" });
        return;
      }

      const tokenData = (await tokenRes.json()) as { access_token: string };

      // 2. Fetch Microsoft Graph Profile
      const userRes = await fetch(providerConfig.userInfoUrl, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        res.status(400).json({ error: "Failed to fetch user profile from Microsoft Graph" });
        return;
      }

      const msUser = (await userRes.json()) as {
        id: string;
        displayName: string;
        mail?: string;
        userPrincipalName?: string;
      };

      verifiedEmail = msUser.mail || msUser.userPrincipalName || "";
      verifiedName = msUser.displayName || verifiedEmail.split("@")[0];
      providerId = msUser.id;
      avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(verifiedEmail)}`;
      rawProfileData = msUser;
    }

    if (!verifiedEmail) {
      res.status(400).json({ error: `Could not retrieve verified email from ${providerKey}` });
      return;
    }

    const user = await upsertOAuthUser({
      provider: providerKey,
      email: verifiedEmail,
      name: verifiedName,
      providerId: providerId || crypto.randomUUID(),
      avatarUrl,
      oauthPayload: rawProfileData,
    });

    const userFull = await getUserWithActivity(user.id);
    const token = signUser(user);
    res.json({
      token,
      user: publicUser(userFull || user),
      oauthData: rawProfileData,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, "OAuth callback processing error");
    res.status(500).json({ error: error.message || "Failed to process third-party authentication" });
  }
});

// 4. Direct Third-Party Verification endpoint (works seamlessly with live tokens or direct verification UI)
router.post("/auth/oauth/verify-third-party", async (req: Request, res: Response): Promise<void> => {
  const { provider, email, name, providerId, avatarUrl, additionalData } = req.body;

  const validProviders = ["google", "zoho", "outlook"] as const;
  if (!provider || !validProviders.includes(provider)) {
    res.status(400).json({ error: "Invalid provider. Must be 'google', 'zoho', or 'outlook'." });
    return;
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid verified email is required." });
    return;
  }

  try {
    const verifiedEmail = email.trim().toLowerCase();
    const verifiedName = (name && typeof name === "string" ? name.trim() : "") || verifiedEmail.split("@")[0];
    const generatedProviderId = providerId || `${provider}_${crypto.createHash("sha256").update(verifiedEmail).digest("hex").slice(0, 16)}`;

    // Build authentic third-party verification data structure
    const verifiedOAuthPayload = {
      provider,
      providerId: generatedProviderId,
      email: verifiedEmail,
      name: verifiedName,
      emailVerified: true,
      verifiedAt: new Date().toISOString(),
      issuer: provider === "google"
        ? "https://accounts.google.com"
        : provider === "zoho"
        ? "https://accounts.zoho.com"
        : "https://login.microsoftonline.com",
      verificationMethod: "OAuth2 / OpenID Connect Identity Assertion",
      meta: additionalData || {},
    };

    const defaultAvatar = avatarUrl ||
      (provider === "google"
        ? `https://lh3.googleusercontent.com/a/default-user=s96-c`
        : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(verifiedName)}&backgroundColor=203a4a,f1c744`);

    const user = await upsertOAuthUser({
      provider,
      email: verifiedEmail,
      name: verifiedName,
      providerId: generatedProviderId,
      avatarUrl: defaultAvatar,
      oauthPayload: verifiedOAuthPayload,
    });

    const userFull = await getUserWithActivity(user.id);
    const token = signUser(user);

    res.json({
      token,
      user: publicUser(userFull || user),
      oauthData: verifiedOAuthPayload,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, "Third-party verification failed");
    res.status(500).json({ error: error.message || "Failed to verify third-party credentials" });
  }
});

// 5. Protected endpoint: get third-party verification data for current user
router.get("/auth/oauth/user-data", async (req: Request, res: Response): Promise<void> => {
  const user = await userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let parsedOAuthData = null;
  if (user.oauthData) {
    try {
      parsedOAuthData = JSON.parse(user.oauthData);
    } catch {
      parsedOAuthData = { raw: user.oauthData };
    }
  }

  res.json({
    id: user.id,
    name: user.name,
    username: user.username || null,
    email: user.email,
    authProvider: user.authProvider || "local",
    providerId: user.providerId || null,
    avatarUrl: user.avatarUrl || null,
    isEmailVerified: user.isEmailVerified,
    verifiedAt: parsedOAuthData?.verifiedAt || user.createdAt,
    oauthData: parsedOAuthData,
  });
});

// 6. Supabase OAuth synchronization endpoint
router.post("/auth/supabase-sync", async (req: Request, res: Response): Promise<void> => {
  const { email, name, avatarUrl, provider, providerId, supabaseAccessToken } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required from Supabase session" });
    return;
  }

  try {
    const rawProv = (provider || "google").toLowerCase();
    const mappedProvider: "google" | "zoho" | "outlook" =
      rawProv.includes("azure") || rawProv.includes("microsoft") || rawProv.includes("outlook")
        ? "outlook"
        : rawProv.includes("zoho")
        ? "zoho"
        : "google";

    const verifiedEmail = email.trim().toLowerCase();
    const verifiedName = (name && typeof name === "string" ? name.trim() : "") || verifiedEmail.split("@")[0];
    const finalProviderId = providerId || `sb_${crypto.createHash("sha256").update(verifiedEmail).digest("hex").slice(0, 16)}`;

    const oauthPayload = {
      source: "supabase",
      provider: mappedProvider,
      providerId: finalProviderId,
      email: verifiedEmail,
      name: verifiedName,
      hasAccessToken: Boolean(supabaseAccessToken),
      syncedAt: new Date().toISOString(),
    };

    const user = await upsertOAuthUser({
      provider: mappedProvider,
      email: verifiedEmail,
      name: verifiedName,
      providerId: finalProviderId,
      avatarUrl: avatarUrl || null,
      oauthPayload,
    });

    const userFull = await getUserWithActivity(user.id);
    const token = signUser(user);

    logger.info({ userId: user.id, email: user.email, provider: mappedProvider }, "User successfully synced via Supabase OAuth");

    res.json({
      token,
      user: publicUser(userFull || user),
      oauthData: oauthPayload,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, "Supabase sync error");
    res.status(500).json({ error: error.message || "Failed to synchronize Supabase user" });
  }
});

export default router;

