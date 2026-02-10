import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "../config/database";

dotenv.config();

const adminEmail = (process.env.ADMIN_EMAIL ?? "laurent@gmail.com")
  .trim()
  .toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminPassword) {
  throw new Error("ADMIN_PASSWORD is required to seed an admin user.");
}

const seedAdmin = async (): Promise<void> => {
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    adminEmail,
  ]);

  if (existing.rowCount && existing.rowCount > 0) {
    await pool.query(
      "UPDATE users SET role = 'admin', password_hash = $1 WHERE email = $2",
      [passwordHash, adminEmail]
    );
    console.log(`Updated admin user: ${adminEmail}`);
    return;
  }

  await pool.query(
    "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')",
    [adminEmail, passwordHash]
  );
  console.log(`Created admin user: ${adminEmail}`);
};

seedAdmin()
  .catch((error) => {
    console.error("Admin seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
