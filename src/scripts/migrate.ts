import dotenv from "dotenv";
import { pool } from "../config/database";

dotenv.config();

const createTables = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      locked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'draft',
      excerpt TEXT,
      category TEXT,
      image_url TEXT,
      event_date DATE,
      event_time TEXT,
      location TEXT,
      external_link TEXT,
      show_on_home_page BOOLEAN NOT NULL DEFAULT FALSE,
      show_on_registration BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'"
  );

  await pool.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE"
  );

  await pool.query(
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt TEXT"
  );
  await pool.query(
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS category TEXT"
  );
  await pool.query(
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT"
  );
  await pool.query(
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_date DATE"
  );
  await pool.query(
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_time TEXT"
  );
  await pool.query(
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS location TEXT"
  );
  await pool.query(
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS external_link TEXT"
  );
  await pool.query(
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS show_on_home_page BOOLEAN NOT NULL DEFAULT FALSE"
  );
  await pool.query(
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS show_on_registration BOOLEAN NOT NULL DEFAULT FALSE"
  );

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'posts_status_check'
      ) THEN
        ALTER TABLE posts
          ADD CONSTRAINT posts_status_check
          CHECK (status IN ('draft', 'review', 'published'));
      END IF;
    END $$;
  `);
};

createTables()
  .then(() => {
    console.log("Migration completed.");
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
