import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set in environment variables.");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
});

(async () => {
  try {
    await client.connect();
    const result = await client.query("SELECT NOW() as now");
    console.log("Database connection successful:", result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
