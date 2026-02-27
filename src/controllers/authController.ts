import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { Secret } from "jsonwebtoken";
import { pool } from "../config/database";
import { logAudit } from "../utils/audit";

type RefreshPayload = {
  userId: number;
  sessionId: string;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

const getRequestIp = (req: Request): string | null => {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]?.trim() ?? null;
  }

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  return req.ip ?? null;
};

const deriveDeviceLabel = (userAgent: string | undefined): string => {
  const ua = userAgent ?? "";
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const os = /Windows NT/i.test(ua)
    ? "Windows"
    : /Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)
      ? "macOS"
      : /Android/i.test(ua)
        ? "Android"
        : /iPhone|iPad/i.test(ua)
          ? "iOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Unknown OS";

  const browser = /Edg/i.test(ua)
    ? "Edge"
    : /Chrome/i.test(ua)
      ? "Chrome"
      : /Safari/i.test(ua) && !/Chrome/i.test(ua)
        ? "Safari"
        : /Firefox/i.test(ua)
          ? "Firefox"
          : "Browser";

  return `${browser} on ${os}${isMobile ? " (Mobile)" : ""}`;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);

  if (existing.rowCount && existing.rowCount > 0) {
    res.status(409).json({ message: "Email already in use." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role",
    [email, passwordHash]
  );
  const createdUser = result.rows[0];

  await logAudit(req, {
    actorId: null,
    action: "auth.register",
    entityType: "user",
    entityId: createdUser.id,
    details: { email: createdUser.email },
  });

  res.status(201).json({ user: createdUser });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ message: "Refresh token is required." });
    return;
  }

  const refreshSecretEnv = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecretEnv) {
    res.status(500).json({ message: "Refresh token secret not configured." });
    return;
  }
  const refreshSecret: Secret = refreshSecretEnv;

  let payload: RefreshPayload;
  try {
    payload = jwt.verify(refreshToken, refreshSecret) as RefreshPayload;
  } catch {
    res.status(401).json({ message: "Invalid refresh token." });
    return;
  }

  const sessionResult = await pool.query(
    `SELECT user_id, revoked_at, expires_at
       FROM user_sessions
      WHERE session_id = $1
        AND refresh_token_hash = $2`,
    [payload.sessionId, hashToken(refreshToken)]
  );

  const session = sessionResult.rows[0];
  if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
    res.status(401).json({ message: "Session expired." });
    return;
  }

  const userResult = await pool.query(
    "SELECT id, email, role, locked FROM users WHERE id = $1",
    [payload.userId]
  );

  if (userResult.rowCount === 0) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const user = userResult.rows[0];
  if (user.locked) {
    res.status(403).json({ message: "Account is locked." });
    return;
  }

  const accessSecretEnv = process.env.JWT_SECRET;
  if (!accessSecretEnv) {
    res.status(500).json({ message: "JWT secret not configured." });
    return;
  }
  const accessSecret: Secret = accessSecretEnv;

  const refreshDays = parseNumber(process.env.REFRESH_TOKEN_DAYS, 30);
  const refreshTtlSeconds = refreshDays * 24 * 60 * 60;
  const nextRefreshToken = jwt.sign(
    { userId: user.id, sessionId: payload.sessionId },
    refreshSecret,
    { expiresIn: refreshTtlSeconds }
  );

  await pool.query(
    `UPDATE user_sessions
        SET refresh_token_hash = $1,
            last_active_at = NOW(),
            ip = $2,
            user_agent = $3
      WHERE session_id = $4`,
    [hashToken(nextRefreshToken), getRequestIp(req), req.get("user-agent") ?? null, payload.sessionId]
  );

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, sessionId: payload.sessionId },
    accessSecret,
    { expiresIn: "1d" }
  );

  res.json({
    token,
    refreshToken: nextRefreshToken,
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await pool.query(
    "SELECT id, email, password_hash, role, locked FROM users WHERE email = $1",
    [email]
  );

  if (result.rowCount === 0) {
    res.status(401).json({ message: "Invalid credentials." });
    return;
  }

  const user = result.rows[0];
  const matches = await bcrypt.compare(password, user.password_hash);

  if (!matches) {
    res.status(401).json({ message: "Invalid credentials." });
    return;
  }

  if (user.locked) {
    res.status(403).json({ message: "Account is locked." });
    return;
  }

  const accessSecretEnv = process.env.JWT_SECRET;
  const refreshSecretEnv = process.env.JWT_REFRESH_SECRET;
  if (!accessSecretEnv) {
    res.status(500).json({ message: "JWT secret not configured." });
    return;
  }

  if (!refreshSecretEnv) {
    res.status(500).json({ message: "Refresh token secret not configured." });
    return;
  }
  const accessSecret: Secret = accessSecretEnv;
  const refreshSecret: Secret = refreshSecretEnv;

  const refreshDays = parseNumber(process.env.REFRESH_TOKEN_DAYS, 30);
  const refreshTtlSeconds = refreshDays * 24 * 60 * 60;
  const sessionId = crypto.randomUUID();
  const refreshToken = jwt.sign(
    { userId: user.id, sessionId },
    refreshSecret,
    { expiresIn: refreshTtlSeconds }
  );

  const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO user_sessions (
        session_id,
        user_id,
        refresh_token_hash,
        device_label,
        user_agent,
        ip,
        location,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      sessionId,
      user.id,
      hashToken(refreshToken),
      deriveDeviceLabel(req.get("user-agent")),
      req.get("user-agent") ?? null,
      getRequestIp(req),
      null,
      expiresAt,
    ]
  );

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, sessionId },
    accessSecret,
    { expiresIn: "1d" }
  );

  await logAudit(req, {
    actorId: user.id,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    details: { email: user.email },
  });

  res.json({
    token,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, locked: user.locked },
  });
};
