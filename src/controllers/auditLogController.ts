import { Request, Response } from "express";
import { pool } from "../config/database";

const parseLimit = (value: unknown, fallback = 50): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 200);
};

const parseOffset = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

export const listAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, entityType, actorId, from, to, q } = req.query as Record<string, string | undefined>;
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    const addCondition = (condition: string, value: string | number) => {
      conditions.push(condition.replace("$", `$${params.length + 1}`));
      params.push(value);
    };

    if (action) {
      addCondition("audit_logs.action ILIKE $", `%${action}%`);
    }

    if (entityType) {
      addCondition("audit_logs.entity_type ILIKE $", `%${entityType}%`);
    }

    if (actorId && Number.isFinite(Number(actorId))) {
      addCondition("audit_logs.actor_id = $", Number(actorId));
    }

    if (from) {
      addCondition("audit_logs.created_at >= $", from);
    }

    if (to) {
      addCondition("audit_logs.created_at <= $", to);
    }

    if (q) {
      const searchValue = `%${q}%`;
      const index = params.length + 1;
      conditions.push(
        `(audit_logs.action ILIKE $${index} OR audit_logs.entity_type ILIKE $${index} OR audit_logs.details::text ILIKE $${index} OR users.email ILIKE $${index})`
      );
      params.push(searchValue);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = parseLimit(req.query.limit, 50);
    const offset = parseOffset(req.query.offset);

    const baseFrom = "FROM audit_logs LEFT JOIN users ON users.id = audit_logs.actor_id";

    const logsQuery = `
      SELECT
        audit_logs.id,
        audit_logs.actor_id,
        users.email AS actor_email,
        audit_logs.action,
        audit_logs.entity_type,
        audit_logs.entity_id,
        audit_logs.details,
        audit_logs.ip,
        audit_logs.user_agent,
        audit_logs.created_at
      ${baseFrom}
      ${whereClause}
      ORDER BY audit_logs.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      ${baseFrom}
      ${whereClause}
    `;

    const [logsResult, countResult] = await Promise.all([
      pool.query(logsQuery, [...params, limit, offset]),
      pool.query(countQuery, params),
    ]);

    res.json({ logs: logsResult.rows, total: countResult.rows[0]?.total ?? 0 });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ 
      message: 'Failed to fetch audit logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
