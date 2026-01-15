import db from "./connection.js";

async function initializeDatabase() {
  console.log("Initializing database...");

  // Create classes table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#228be6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create events table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date DATETIME NOT NULL,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      event_type TEXT CHECK(event_type IN ('quiz', 'assignment', 'exam', 'homework', 'lab')),
      status TEXT DEFAULT 'incomplete' CHECK(status IN ('incomplete', 'in_progress', 'complete')),
      notes TEXT,
      url TEXT,
      canvas_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add status column to existing events table if it doesn't exist
  try {
    await db.execute(
      `ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'incomplete' CHECK(status IN ('incomplete', 'in_progress', 'complete'))`
    );
    console.log("Added status column to events table");
  } catch (err) {
    // Column likely already exists, ignore error
  }

  // Create rejected_items table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rejected_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      canvas_id TEXT NOT NULL,
      rejected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, canvas_id)
    )
  `);

  console.log("Database initialized successfully!");
}

initializeDatabase().catch(console.error);

export { initializeDatabase };
