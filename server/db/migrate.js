import { readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import db from "./connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, "migrations");

async function ensureMigrationsTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getExecutedMigrations() {
  const result = await db.execute("SELECT name FROM migrations ORDER BY name");
  return new Set(result.rows.map((row) => row.name));
}

async function runMigration(name, sql) {
  console.log(`Running migration: ${name}`);

  // Split by semicolons but handle edge cases (empty statements)
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }

  await db.execute({
    sql: "INSERT INTO migrations (name) VALUES (?)",
    args: [name],
  });

  console.log(`Completed migration: ${name}`);
}

export async function migrate() {
  console.log("Starting database migrations...");

  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();

  // Get all migration files sorted by name
  let migrationFiles;
  try {
    migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("No migrations directory found, skipping migrations.");
      return;
    }
    throw err;
  }

  let ranCount = 0;
  for (const file of migrationFiles) {
    if (!executed.has(file)) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
      await runMigration(file, sql);
      ranCount++;
    }
  }

  if (ranCount === 0) {
    console.log("No new migrations to run.");
  } else {
    console.log(`Ran ${ranCount} migration(s) successfully.`);
  }
}

// Allow running directly: node server/db/migrate.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
