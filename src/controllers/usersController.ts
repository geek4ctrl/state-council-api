import { Request, Response } from "express";
import { pool } from "../config/database";

type UserRole = "user" | "admin";

export const listUsers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const result = await pool.query(
    "SELECT id, email, role, created_at FROM users ORDER BY id ASC"
  );

  res.json({ users: result.rows });
};

export const updateUserRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = Number(req.params.id);
  const { role } = req.body as { role: UserRole };
  const actorId = req.user?.id;

  if (!actorId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  if (actorId === userId && role !== "admin") {
    res.status(400).json({ message: "Cannot remove your own admin role." });
    return;
  }

  const existing = await pool.query(
    "SELECT id, email, role FROM users WHERE id = $1",
    [userId]
  );

  if (existing.rowCount === 0) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const updated = await pool.query(
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role",
    [role, userId]
  );

  res.json({ user: updated.rows[0] });
};
