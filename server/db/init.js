import db from "./connection.js";

async function initializeDatabase() {
  console.log("Initializing database...");

  // Create classes table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3498db',
      canvas_course_id TEXT,
      is_synced INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create events table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATE NOT NULL,
      due_time TIME,
      status TEXT DEFAULT 'incomplete',
      class_id INTEGER,
      canvas_id TEXT,
      canvas_url TEXT,
      event_type TEXT,
      notes TEXT,
      url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id)
    )
  `);

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
