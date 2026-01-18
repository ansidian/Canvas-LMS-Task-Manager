import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import multer from 'multer';
import db from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});

const CONCURRENT_ASSIGNMENT_FETCHES = 5;

const getNextLink = (linkHeader) => {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const [urlPart, relPart] = part.split(';').map((item) => item.trim());
    if (!urlPart || !relPart) continue;
    if (relPart === 'rel="next"') {
      return urlPart.replace(/^<|>$/g, '');
    }
  }
  return null;
};

const fetchAllPages = async (url, headers) => {
  const results = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers });
    if (!res.ok) {
      throw new Error(`Canvas API error: ${res.status}`);
    }
    const data = await res.json();
    results.push(...data);
    nextUrl = getNextLink(res.headers.get('link'));
  }

  return results;
};

const mapLimit = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let index = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () =>
      (async () => {
        while (index < items.length) {
          const currentIndex = index;
          index += 1;
          results[currentIndex] = await mapper(items[currentIndex]);
        }
      })(),
  );

  await Promise.all(workers);
  return results;
};

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')));
}

// ============= CLASSES API =============

// Get all classes
app.get('/api/classes', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM classes WHERE user_id = ? ORDER BY sort_order, name',
      args: [userId],
    });
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

// Create class
app.post('/api/classes', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const { name, color, canvas_course_id } = req.body;
  try {
    const maxSortOrderResult = await db.execute({
      sql: 'SELECT COALESCE(MAX(sort_order), -1) AS max_sort_order FROM classes WHERE user_id = ?',
      args: [userId],
    });
    const maxSortOrder = maxSortOrderResult.rows[0]?.max_sort_order ?? -1;
    const nextSortOrder = Number(maxSortOrder) + 1;

    const result = await db.execute({
      sql: 'INSERT INTO classes (user_id, name, color, canvas_course_id, sort_order) VALUES (?, ?, ?, ?, ?)',
      args: [
        userId,
        name,
        color || '#3498db',
        canvas_course_id || null,
        nextSortOrder,
      ],
    });
    const newClass = await db.execute({
      sql: 'SELECT * FROM classes WHERE id = ? AND user_id = ?',
      args: [result.lastInsertRowid, userId],
    });
    res.status(201).json(newClass.rows[0]);
  } catch (err) {
    console.error('Error creating class:', err);
    res.status(500).json({ message: 'Failed to create class' });
  }
});

// Update class order
app.patch('/api/classes/order', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return res.status(400).json({ message: 'orderedIds must be a non-empty array' });
  }

  try {
    for (let index = 0; index < orderedIds.length; index += 1) {
      const classId = orderedIds[index];
      await db.execute({
        sql: 'UPDATE classes SET sort_order = ? WHERE id = ? AND user_id = ?',
        args: [index, classId, userId],
      });
    }

    const updated = await db.execute({
      sql: 'SELECT * FROM classes WHERE user_id = ? ORDER BY sort_order, name',
      args: [userId],
    });

    res.json(updated.rows);
  } catch (err) {
    console.error('Error updating class order:', err);
    res.status(500).json({ message: 'Failed to update class order' });
  }
});

// Update class
app.patch('/api/classes/:id', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;
  const { name, color, canvas_course_id, is_synced, sort_order } = req.body;
  try {
    // Build update query dynamically based on provided fields
    const updates = [];
    const args = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      args.push(color);
    }
    if (canvas_course_id !== undefined) {
      updates.push('canvas_course_id = ?');
      args.push(canvas_course_id);
    }
    if (is_synced !== undefined) {
      updates.push('is_synced = ?');
      args.push(is_synced ? 1 : 0);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      args.push(sort_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    args.push(id, userId);

    await db.execute({
      sql: `UPDATE classes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: 'SELECT * FROM classes WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error updating class:', err);
    res.status(500).json({ message: 'Failed to update class' });
  }
});


// Delete class
app.delete('/api/classes/:id', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;
  try {
    await db.execute({
      sql: 'DELETE FROM classes WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting class:', err);
    res.status(500).json({ message: 'Failed to delete class' });
  }
});

// ============= EVENTS API =============

// Get all events
app.get('/api/events', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  try {
    const result = await db.execute({
      sql: `
        SELECT e.*, c.name as class_name, c.color as class_color
        FROM events e
        LEFT JOIN classes c ON e.class_id = c.id AND c.user_id = ?
        WHERE e.user_id = ?
        ORDER BY e.due_date
      `,
      args: [userId, userId],
    });
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// Create event
app.post('/api/events', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const {
    title,
    description,
    due_date,
    class_id,
    event_type,
    status,
    notes,
    url,
    canvas_id,
    points_possible,
  } = req.body;
  try {
    const result = await db.execute({
      sql: `INSERT INTO events (user_id, title, description, due_date, class_id, event_type, status, notes, url, canvas_id, points_possible)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        title,
        description ?? null,
        due_date,
        class_id || null,
        event_type,
        status || 'incomplete',
        notes ?? null,
        url ?? null,
        canvas_id ?? null,
        points_possible ?? null,
      ],
    });
    const newEvent = await db.execute({
      sql: `SELECT e.*, c.name as class_name, c.color as class_color
            FROM events e
            LEFT JOIN classes c ON e.class_id = c.id AND c.user_id = ?
            WHERE e.id = ? AND e.user_id = ?`,
      args: [userId, result.lastInsertRowid, userId],
    });
    res.status(201).json(newEvent.rows[0]);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

// Update event
app.patch('/api/events/:id', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;
  const {
    title,
    description,
    due_date,
    class_id,
    event_type,
    status,
    notes,
    url,
    points_possible,
  } = req.body;

  try {
    // Build update query dynamically based on provided fields
    const updates = [];
    const args = [];

    if (title !== undefined) {
      updates.push('title = ?');
      args.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      args.push(description);
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
    if (points_possible !== undefined) {
      updates.push('points_possible = ?');
      args.push(points_possible);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(id, userId);

    await db.execute({
      sql: `UPDATE events SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: `SELECT e.*, c.name as class_name, c.color as class_color
            FROM events e
            LEFT JOIN classes c ON e.class_id = c.id AND c.user_id = ?
            WHERE e.id = ? AND e.user_id = ?`,
      args: [userId, id, userId],
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ message: 'Failed to update event' });
  }
});

// Delete event
app.delete('/api/events/:id', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const { id } = req.params;
  try {
    await db.execute({
      sql: 'DELETE FROM events WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

// ============= SETTINGS API =============

// Get settings (creates default if not exists)
app.get('/api/settings', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  try {
    // Try to get existing settings
    let result = await db.execute({
      sql: 'SELECT * FROM settings WHERE user_id = ?',
      args: [userId],
    });

    // If no settings exist, create default
    if (result.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO settings (user_id) VALUES (?)',
        args: [userId],
      });
      result = await db.execute({
        sql: 'SELECT * FROM settings WHERE user_id = ?',
        args: [userId],
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// Update settings
app.patch('/api/settings', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const { unassigned_color } = req.body;
  try {
    // Ensure settings exist first
    await db.execute({
      sql: 'INSERT OR IGNORE INTO settings (user_id) VALUES (?)',
      args: [userId],
    });

    // Build update query
    const updates = [];
    const args = [];

    if (unassigned_color !== undefined) {
      updates.push('unassigned_color = ?');
      args.push(unassigned_color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(userId);

    await db.execute({
      sql: `UPDATE settings SET ${updates.join(', ')} WHERE user_id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: 'SELECT * FROM settings WHERE user_id = ?',
      args: [userId],
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

// ============= REJECTED ITEMS API =============

// Add rejected item
app.post('/api/rejected', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const { canvas_id } = req.body;
  try {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO rejected_items (user_id, canvas_id) VALUES (?, ?)',
      args: [userId, canvas_id],
    });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error rejecting item:', err);
    res.status(500).json({ message: 'Failed to reject item' });
  }
});

// ============= CANVAS API PROXY =============

// Fetch assignments from Canvas
app.get('/api/canvas/assignments', requireAuth(), async (req, res) => {
  const userId = req.auth().userId;
  const canvasUrl = req.headers['x-canvas-url'];
  const canvasToken = req.headers['x-canvas-token'];

  if (!canvasUrl || !canvasToken) {
    return res.status(400).json({ message: 'Canvas URL and token required' });
  }

  try {
    // Normalize URL (remove trailing slash)
    const baseUrl = canvasUrl.replace(/\/$/, '');

    const headers = { Authorization: `Bearer ${canvasToken}` };
    const courses = await fetchAllPages(
      `${baseUrl}/api/v1/courses?enrollment_state=active&per_page=100`,
      headers,
    );

    // Fetch assignments from all courses (sync filtering happens client-side)
    const allAssignments = [];

    const assignmentResults = await mapLimit(
      courses,
      CONCURRENT_ASSIGNMENT_FETCHES,
      async (course) => {
        try {
          const assignments = await fetchAllPages(
            `${baseUrl}/api/v1/courses/${course.id}/assignments?per_page=100`,
            headers,
          );
          return { course, assignments };
        } catch (err) {
          console.error(
            `Error fetching assignments for course ${course.id}:`,
            err,
          );
          return { course, assignments: [] };
        }
      },
    );

    for (const { course, assignments } of assignmentResults) {
      const courseIdStr = String(course.id);
      for (const assignment of assignments) {
        if (assignment.due_at) {
          allAssignments.push({
            canvas_id: `${course.id}-${assignment.id}`,
            canvas_course_id: courseIdStr,
            title: assignment.name,
            due_date: assignment.due_at, // Preserve full ISO 8601 timestamp
            course_name: course.name,
            url: assignment.html_url,
            description: assignment.description,
            points_possible: assignment.points_possible,
          });
        }
      }
    }

    // Filter out already approved or rejected items for this user
    const existingEvents = await db.execute({
      sql: 'SELECT canvas_id FROM events WHERE user_id = ? AND canvas_id IS NOT NULL',
      args: [userId],
    });
    const rejectedItems = await db.execute({
      sql: 'SELECT canvas_id FROM rejected_items WHERE user_id = ?',
      args: [userId],
    });

    const existingIds = new Set([
      ...existingEvents.rows.map((r) => r.canvas_id),
      ...rejectedItems.rows.map((r) => r.canvas_id),
    ]);

    const pendingAssignments = allAssignments.filter((a) => !existingIds.has(a.canvas_id));

    // Return both assignments and all courses (for class creation)
    const canvasCourses = courses.map((c) => ({
      canvas_course_id: String(c.id),
      name: c.name,
    }));

    res.json({ assignments: pendingAssignments, courses: canvasCourses });
  } catch (err) {
    console.error('Error fetching Canvas assignments:', err);
    res.status(500).json({ message: 'Failed to fetch Canvas assignments' });
  }
});

// Fetch assignment details from Canvas
app.get('/api/canvas/assignment', requireAuth(), async (req, res) => {
  const canvasUrl = req.headers['x-canvas-url'];
  const canvasToken = req.headers['x-canvas-token'];
  const { courseId, assignmentId } = req.query;

  if (!canvasUrl || !canvasToken) {
    return res.status(400).json({ message: 'Canvas URL and token required' });
  }
  if (!courseId || !assignmentId) {
    return res.status(400).json({ message: 'courseId and assignmentId required' });
  }

  try {
    const baseUrl = canvasUrl.replace(/\/$/, '');
    const assignmentRes = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}`,
      {
        headers: {
          Authorization: `Bearer ${canvasToken}`,
          'Accept-Language': 'en-US',
        },
      }
    );

    if (!assignmentRes.ok) {
      throw new Error(`Canvas API error: ${assignmentRes.status}`);
    }

    const assignment = await assignmentRes.json();
    res.json({
      id: assignment.id,
      name: assignment.name,
      submission_types: assignment.submission_types || [],
      allowed_extensions: assignment.allowed_extensions || [],
      locked_for_user: !!assignment.locked_for_user,
      lock_explanation: assignment.lock_explanation || null,
      quiz_id: assignment.quiz_id || null,
      due_at: assignment.due_at || null,
    });
  } catch (err) {
    console.error('Error fetching Canvas assignment:', err);
    res.status(500).json({ message: 'Failed to fetch Canvas assignment' });
  }
});

// Fetch current submission for assignment
app.get('/api/canvas/submissions/self', requireAuth(), async (req, res) => {
  const canvasUrl = req.headers['x-canvas-url'];
  const canvasToken = req.headers['x-canvas-token'];
  const { courseId, assignmentId } = req.query;

  if (!canvasUrl || !canvasToken) {
    return res.status(400).json({ message: 'Canvas URL and token required' });
  }
  if (!courseId || !assignmentId) {
    return res.status(400).json({ message: 'courseId and assignmentId required' });
  }

  try {
    const baseUrl = canvasUrl.replace(/\/$/, '');
    const submissionRes = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self`,
      { headers: { Authorization: `Bearer ${canvasToken}` } }
    );

    if (!submissionRes.ok) {
      throw new Error(`Canvas API error: ${submissionRes.status}`);
    }

    const submission = await submissionRes.json();
    res.json(submission);
  } catch (err) {
    console.error('Error fetching Canvas submission:', err);
    res.status(500).json({ message: 'Failed to fetch Canvas submission' });
  }
});

// Submit non-file assignments (text entry, URL)
app.post('/api/canvas/submissions/submit', requireAuth(), async (req, res) => {
  const canvasUrl = req.headers['x-canvas-url'];
  const canvasToken = req.headers['x-canvas-token'];
  const { courseId, assignmentId, submissionType, body, url, comment } = req.body;

  if (!canvasUrl || !canvasToken) {
    return res.status(400).json({ message: 'Canvas URL and token required' });
  }
  if (!courseId || !assignmentId || !submissionType) {
    return res.status(400).json({ message: 'courseId, assignmentId, and submissionType required' });
  }

  try {
    const baseUrl = canvasUrl.replace(/\/$/, '');
    const submitParams = new URLSearchParams();
    submitParams.append('submission[submission_type]', submissionType);

    if (submissionType === 'online_text_entry') {
      submitParams.append('submission[body]', body || '');
    } else if (submissionType === 'online_url') {
      submitParams.append('submission[url]', url || '');
    }

    if (comment) {
      submitParams.append('submission[comment][text_comment]', comment);
      submitParams.append('submission[comment]', comment);
    }

    const submitRes = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${canvasToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: submitParams.toString(),
      }
    );

    if (!submitRes.ok) {
      throw new Error(`Canvas submission failed: ${submitRes.status}`);
    }

    const submission = await submitRes.json();

    let verifiedSubmission = submission;
    try {
      const verifyRes = await fetch(
        `${baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self`,
        { headers: { Authorization: `Bearer ${canvasToken}` } }
      );
      if (verifyRes.ok) {
        verifiedSubmission = await verifyRes.json();
      }
    } catch (err) {
      console.warn('Canvas submission verification failed:', err);
    }

    res.json({ submission: verifiedSubmission });
  } catch (err) {
    console.error('Error submitting Canvas assignment:', err);
    res.status(500).json({ message: 'Failed to submit Canvas assignment' });
  }
});

// Upload file(s) and submit assignment
app.post(
  '/api/canvas/submissions/upload',
  requireAuth(),
  upload.array('files'),
  async (req, res) => {
    const canvasUrl = req.headers['x-canvas-url'];
    const canvasToken = req.headers['x-canvas-token'];
    const { courseId, assignmentId, comment } = req.body;
    const files = req.files || [];

    if (!canvasUrl || !canvasToken) {
      return res.status(400).json({ message: 'Canvas URL and token required' });
    }
    if (!courseId || !assignmentId) {
      return res.status(400).json({ message: 'courseId and assignmentId required' });
    }
    if (!files.length) {
      return res.status(400).json({ message: 'At least one file is required' });
    }

    try {
      const baseUrl = canvasUrl.replace(/\/$/, '');
      const fileIds = [];

      for (const file of files) {
        const preflightRes = await fetch(
          `${baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self/files`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${canvasToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: file.originalname,
              size: file.size,
              content_type: file.mimetype || 'application/octet-stream',
            }),
          }
        );

        if (!preflightRes.ok) {
          throw new Error(`Canvas upload preflight failed: ${preflightRes.status}`);
        }

        const preflight = await preflightRes.json();
        if (!preflight.upload_url || !preflight.upload_params) {
          throw new Error('Canvas upload preflight missing upload_url');
        }

        const form = new FormData();
        for (const [key, value] of Object.entries(preflight.upload_params)) {
          form.append(key, value);
        }
        const blob = new Blob([file.buffer], {
          type: file.mimetype || 'application/octet-stream',
        });
        form.append('file', blob, file.originalname);

        const uploadRes = await fetch(preflight.upload_url, {
          method: 'POST',
          body: form,
        });
        const uploadText = await uploadRes.text();

        if (!uploadRes.ok) {
          throw new Error(`Canvas file upload failed: ${uploadRes.status}`);
        }

        let uploadJson = null;
        try {
          uploadJson = JSON.parse(uploadText);
        } catch (err) {
          // Non-JSON responses are unexpected; fall through to error below.
        }

        const fileId = uploadJson?.id || uploadJson?.attachment?.id;
        if (!fileId) {
          throw new Error('Canvas upload response missing file id');
        }
        fileIds.push(fileId);
      }

      const submitParams = new URLSearchParams();
      submitParams.append('submission[submission_type]', 'online_upload');
      for (const fileId of fileIds) {
        submitParams.append('submission[file_ids][]', String(fileId));
      }
      if (comment) {
        submitParams.append('submission[comment][text_comment]', comment);
        submitParams.append('submission[comment]', comment);
      }

      const submitRes = await fetch(
        `${baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${canvasToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: submitParams.toString(),
        }
      );

      if (!submitRes.ok) {
        throw new Error(`Canvas submission failed: ${submitRes.status}`);
      }

      const submission = await submitRes.json();

      let verifiedSubmission = submission;
      try {
        const verifyRes = await fetch(
          `${baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self`,
          { headers: { Authorization: `Bearer ${canvasToken}` } }
        );
        if (verifyRes.ok) {
          verifiedSubmission = await verifyRes.json();
        }
      } catch (err) {
        console.warn('Canvas submission verification failed:', err);
      }

      res.json({ submission: verifiedSubmission, file_ids: fileIds });
    } catch (err) {
      console.error('Error submitting Canvas assignment:', err);
      res.status(500).json({ message: 'Failed to submit Canvas assignment' });
    }
  }
);

// SPA fallback for production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
