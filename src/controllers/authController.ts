import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import { logAudit } from "../utils/audit";

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

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: "JWT secret not configured." });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    secret,
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
    user: { id: user.id, email: user.email, role: user.role, locked: user.locked },
  });
};
