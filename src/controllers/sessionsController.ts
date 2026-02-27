import { Request, Response } from "express";
import { pool } from "../config/database";

const parseSessionId = (value: string): string => value.trim();

export const listSessions = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const result = await pool.query(
    `SELECT session_id, device_label, user_agent, ip, location,
            created_at, last_active_at, expires_at
       FROM user_sessions
      WHERE user_id = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
   ORDER BY last_active_at DESC`,
    [user.id]
  );

  const currentSessionId = (req.user as { sessionId?: string } | undefined)?.sessionId;

  const sessions = result.rows.map((row) => ({
    id: row.session_id,
    device: row.device_label ?? "Unknown device",
    userAgent: row.user_agent ?? null,
    ip: row.ip ?? null,
    location: row.location ?? null,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
    expiresAt: row.expires_at,
    isCurrent: row.session_id === currentSessionId,
  }));

  res.json({ sessions });
};

export const revokeSession = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const sessionId = parseSessionId(String(req.params.id ?? ""));
  if (!sessionId) {
    res.status(400).json({ message: "Session id is required." });
    return;
  }

  const result = await pool.query(
    `UPDATE user_sessions
        SET revoked_at = NOW()
      WHERE session_id = $1
        AND user_id = $2
        AND revoked_at IS NULL
      RETURNING session_id`,
    [sessionId, user.id]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ message: "Session not found." });
    return;
  }

  res.status(204).send();
};
