import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";

interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  sessionId?: string;
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authorization token missing." });
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: "JWT secret not configured." });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };

    const sessionId = payload.sessionId;
    if (!sessionId) {
      next();
      return;
    }

    void pool
      .query(
        `SELECT revoked_at, expires_at
           FROM user_sessions
          WHERE session_id = $1
            AND user_id = $2`,
        [sessionId, payload.userId]
      )
      .then((result) => {
        const session = result.rows[0];
        if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
          res.status(401).json({ message: "Session expired." });
          return;
        }

        pool.query(
          `UPDATE user_sessions
              SET last_active_at = NOW(),
                  ip = $1,
                  user_agent = $2
            WHERE session_id = $3`,
          [req.ip ?? null, req.get("user-agent") ?? null, sessionId]
        ).catch(() => undefined);

        next();
      })
      .catch(() => {
        res.status(401).json({ message: "Session expired." });
      });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  } catch (_error) {
    // Ignore invalid tokens for optional auth.
  }

  next();
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;

  if (!user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  if (user.role !== "admin") {
    res.status(403).json({ message: "Forbidden." });
    return;
  }

  next();
};
