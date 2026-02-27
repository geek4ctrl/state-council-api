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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details JSONB,
      ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT NOT NULL,
      device_label TEXT,
      user_agent TEXT,
      ip TEXT,
      location TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
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

  await pool.query(
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id INTEGER"
  );
  await pool.query(
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action TEXT"
  );
  await pool.query(
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT"
  );
  await pool.query(
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT"
  );
  await pool.query(
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB"
  );
  await pool.query(
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip TEXT"
  );
  await pool.query(
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT"
  );
  await pool.query(
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()"
  );

  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_id TEXT"
  );
  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_id INTEGER"
  );
  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT"
  );
  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_label TEXT"
  );
  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT"
  );
  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip TEXT"
  );
  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS location TEXT"
  );
  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()"
  );
  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP NOT NULL DEFAULT NOW()"
  );
  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP"
  );
  await pool.query(
    "ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP"
  );

  await pool.query(
    "CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS user_sessions_session_id_idx ON user_sessions (session_id)"
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
