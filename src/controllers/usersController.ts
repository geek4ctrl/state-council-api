import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/database";

type UserRole = "user" | "admin";

export const listUsers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const result = await pool.query(
    "SELECT id, email, role, locked, created_at FROM users ORDER BY id ASC"
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
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role, locked",
    [role, userId]
  );

  res.json({ user: updated.rows[0] });
};

export const setUserLock = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = Number(req.params.id);
  const { locked } = req.body as { locked: boolean };
  const actorId = req.user?.id;

  if (!actorId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  if (actorId === userId && locked) {
    res.status(400).json({ message: "Cannot lock your own account." });
    return;
  }

  const existing = await pool.query(
    "SELECT id FROM users WHERE id = $1",
    [userId]
  );

  if (existing.rowCount === 0) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const updated = await pool.query(
    "UPDATE users SET locked = $1 WHERE id = $2 RETURNING id, email, role, locked",
    [locked, userId]
  );

  res.json({ user: updated.rows[0] });
};

export const resetUserPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = Number(req.params.id);
  const { password } = req.body as { password: string };

  const existing = await pool.query(
    "SELECT id FROM users WHERE id = $1",
    [userId]
  );

  if (existing.rowCount === 0) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    "UPDATE users SET password_hash = $1 WHERE id = $2",
    [passwordHash, userId]
  );

  res.json({ message: "Password reset successful." });
};
