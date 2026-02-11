import { Request } from "express";
import { pool } from "../config/database";

type AuditLogInput = {
  actorId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | string | null;
  details?: Record<string, unknown> | null;
};

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

export const logAudit = async (req: Request, input: AuditLogInput): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        details,
        ip,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.actorId ?? null,
        input.action,
        input.entityType,
        input.entityId ? String(input.entityId) : null,
        input.details ?? null,
        getRequestIp(req),
        req.get("user-agent") ?? null,
      ]
    );
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
};
