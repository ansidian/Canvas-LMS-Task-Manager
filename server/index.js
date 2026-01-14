import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')));
}

// ============= CLASSES API =============

// Get all classes
app.get('/api/classes', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM classes ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

// Create class
app.post('/api/classes', async (req, res) => {
  const { name, color } = req.body;
  try {
    const result = await db.execute({
      sql: 'INSERT INTO classes (name, color) VALUES (?, ?)',
      args: [name, color || '#228be6'],
    });
    const newClass = await db.execute({
      sql: 'SELECT * FROM classes WHERE id = ?',
      args: [result.lastInsertRowid],
    });
    res.status(201).json(newClass.rows[0]);
  } catch (err) {
    console.error('Error creating class:', err);
    res.status(500).json({ message: 'Failed to create class' });
  }
});

// Update class
app.patch('/api/classes/:id', async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  try {
    await db.execute({
      sql: 'UPDATE classes SET name = ?, color = ? WHERE id = ?',
      args: [name, color, id],
    });
    const updated = await db.execute({
      sql: 'SELECT * FROM classes WHERE id = ?',
      args: [id],
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error updating class:', err);
    res.status(500).json({ message: 'Failed to update class' });
  }
});

// Delete class
app.delete('/api/classes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({
      sql: 'DELETE FROM classes WHERE id = ?',
      args: [id],
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting class:', err);
    res.status(500).json({ message: 'Failed to delete class' });
  }
});

// ============= EVENTS API =============

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT e.*, c.name as class_name, c.color as class_color
      FROM events e
      LEFT JOIN classes c ON e.class_id = c.id
      ORDER BY e.due_date
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// Create event
app.post('/api/events', async (req, res) => {
  const { title, due_date, class_id, event_type, status, notes, url, canvas_id } = req.body;
  try {
    const result = await db.execute({
      sql: `INSERT INTO events (title, due_date, class_id, event_type, status, notes, url, canvas_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [title, due_date, class_id || null, event_type, status || 'incomplete', notes || null, url || null, canvas_id || null],
    });
    const newEvent = await db.execute({
      sql: `SELECT e.*, c.name as class_name, c.color as class_color
            FROM events e
            LEFT JOIN classes c ON e.class_id = c.id
            WHERE e.id = ?`,
      args: [result.lastInsertRowid],
    });
    res.status(201).json(newEvent.rows[0]);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

// Update event
app.patch('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const { title, due_date, class_id, event_type, status, notes, url } = req.body;

  try {
    // Build update query dynamically based on provided fields
    const updates = [];
    const args = [];

    if (title !== undefined) {
      updates.push('title = ?');
      args.push(title);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      args.push(due_date);
    }
    if (class_id !== undefined) {
      updates.push('class_id = ?');
      args.push(class_id);
    }
    if (event_type !== undefined) {
      updates.push('event_type = ?');
      args.push(event_type);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      args.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      args.push(notes);
    }
    if (url !== undefined) {
      updates.push('url = ?');
      args.push(url);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(id);

    await db.execute({
      sql: `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: `SELECT e.*, c.name as class_name, c.color as class_color
            FROM events e
            LEFT JOIN classes c ON e.class_id = c.id
            WHERE e.id = ?`,
      args: [id],
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ message: 'Failed to update event' });
  }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({
      sql: 'DELETE FROM events WHERE id = ?',
      args: [id],
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

// ============= REJECTED ITEMS API =============

// Add rejected item
app.post('/api/rejected', async (req, res) => {
  const { canvas_id } = req.body;
  try {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO rejected_items (canvas_id) VALUES (?)',
      args: [canvas_id],
    });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error rejecting item:', err);
    res.status(500).json({ message: 'Failed to reject item' });
  }
});

// ============= CANVAS API PROXY =============

// Fetch assignments from Canvas
app.get('/api/canvas/assignments', async (req, res) => {
  const canvasUrl = req.headers['x-canvas-url'];
  const canvasToken = req.headers['x-canvas-token'];

  if (!canvasUrl || !canvasToken) {
    return res.status(400).json({ message: 'Canvas URL and token required' });
  }

  try {
    // Normalize URL (remove trailing slash)
    const baseUrl = canvasUrl.replace(/\/$/, '');

    // Fetch courses
    const coursesRes = await fetch(`${baseUrl}/api/v1/courses?enrollment_state=active&per_page=100`, {
      headers: { Authorization: `Bearer ${canvasToken}` },
    });

    if (!coursesRes.ok) {
      throw new Error(`Canvas API error: ${coursesRes.status}`);
    }

    const courses = await coursesRes.json();

    // Fetch assignments from each course
    const allAssignments = [];

    for (const course of courses) {
      try {
        const assignmentsRes = await fetch(
          `${baseUrl}/api/v1/courses/${course.id}/assignments?per_page=100`,
          { headers: { Authorization: `Bearer ${canvasToken}` } }
        );

        if (assignmentsRes.ok) {
          const assignments = await assignmentsRes.json();
          for (const assignment of assignments) {
            if (assignment.due_at) {
              allAssignments.push({
                canvas_id: `${course.id}-${assignment.id}`,
                title: assignment.name,
                due_date: assignment.due_at.split('T')[0],
                course_name: course.name,
                url: assignment.html_url,
              });
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching assignments for course ${course.id}:`, err);
      }
    }

    // Filter out already approved or rejected items
    const existingEvents = await db.execute('SELECT canvas_id FROM events WHERE canvas_id IS NOT NULL');
    const rejectedItems = await db.execute('SELECT canvas_id FROM rejected_items');

    const existingIds = new Set([
      ...existingEvents.rows.map((r) => r.canvas_id),
      ...rejectedItems.rows.map((r) => r.canvas_id),
    ]);

    const pendingAssignments = allAssignments.filter((a) => !existingIds.has(a.canvas_id));

    res.json(pendingAssignments);
  } catch (err) {
    console.error('Error fetching Canvas assignments:', err);
    res.status(500).json({ message: 'Failed to fetch Canvas assignments' });
  }
});

// SPA fallback for production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
