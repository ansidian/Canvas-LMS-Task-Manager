import { Router } from "express";
import db from "../db/connection.js";
import { requireUser } from "../middleware/clerk-auth.js";

const router = Router();

router.use(requireUser());

// POST /api/merge - Merge guest data into authenticated account
router.post("/", async (req, res) => {
  const userId = req.auth().userId;
  const {
    guestSessionId,
    guestClasses,
    guestEvents,
    guestSettings,
    resolutions,
  } = req.body;

  try {
    let mergedEventsCount = 0;
    let mergedClassesCount = 0;
    const classIdMapping = {}; // Maps guest class IDs to authenticated class IDs

    // 1. Merge classes
    // For each guest class, check if authenticated user has a class with same canvas_course_id
    if (guestClasses && Array.isArray(guestClasses)) {
      for (const guestClass of guestClasses) {
        let authClassId = null;

        // Check if user has a class with this canvas_course_id
        if (guestClass.canvas_course_id) {
          const existingClass = await db.execute({
            sql: "SELECT id FROM classes WHERE user_id = ? AND canvas_course_id = ?",
            args: [userId, guestClass.canvas_course_id],
          });

          if (existingClass.rows.length > 0) {
            // Class already exists, use its ID
            authClassId = existingClass.rows[0].id;
          }
        }

        // If no matching class found, insert new class
        if (!authClassId) {
          const result = await db.execute({
            sql: `INSERT INTO classes (user_id, name, color, canvas_course_id, is_synced, sort_order)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              userId,
              guestClass.name,
              guestClass.color || "#3498db",
              guestClass.canvas_course_id || null,
              guestClass.is_synced !== undefined ? guestClass.is_synced : 1,
              guestClass.sort_order || 0,
            ],
          });
          authClassId = result.lastInsertRowid;
          mergedClassesCount++;
        }

        // Map guest class ID to authenticated class ID
        classIdMapping[guestClass.id] = authClassId;
      }
    }

    // 2. Merge events
    // For each guest event, check for duplicates and apply resolution
    if (guestEvents && Array.isArray(guestEvents)) {
      for (const guestEvent of guestEvents) {
        let isDuplicate = false;
        let existingEventId = null;

        // Check for duplicate by canvas_id first (most reliable)
        if (guestEvent.canvas_id) {
          const canvasMatch = await db.execute({
            sql: "SELECT id FROM events WHERE user_id = ? AND canvas_id = ?",
            args: [userId, guestEvent.canvas_id],
          });

          if (canvasMatch.rows.length > 0) {
            isDuplicate = true;
            existingEventId = canvasMatch.rows[0].id;
          }
        }

        // If no canvas_id match, check by title + due_date
        if (!isDuplicate && guestEvent.title && guestEvent.due_date) {
          const titleMatch = await db.execute({
            sql: "SELECT id FROM events WHERE user_id = ? AND title = ? AND due_date = ?",
            args: [userId, guestEvent.title, guestEvent.due_date],
          });

          if (titleMatch.rows.length > 0) {
            isDuplicate = true;
            existingEventId = titleMatch.rows[0].id;
          }
        }

        // Handle based on duplicate status and resolution
        if (isDuplicate) {
          const resolution = resolutions?.[guestEvent.id] || "auth";

          // Map guest class_id to authenticated class_id
          const mappedClassId = guestEvent.class_id
            ? classIdMapping[guestEvent.class_id] || null
            : null;

          if (resolution === "guest") {
            // Update existing event with guest data
            await db.execute({
              sql: `UPDATE events
                    SET title = ?, description = ?, due_date = ?, class_id = ?,
                        event_type = ?, status = ?, notes = ?, url = ?,
                        points_possible = ?, canvas_due_date_override = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND user_id = ?`,
              args: [
                guestEvent.title,
                guestEvent.description || null,
                guestEvent.due_date,
                mappedClassId,
                guestEvent.event_type || null,
                guestEvent.status || "incomplete",
                guestEvent.notes || null,
                guestEvent.url || null,
                guestEvent.points_possible || null,
                guestEvent.canvas_due_date_override || 0,
                existingEventId,
                userId,
              ],
            });
            mergedEventsCount++;
          } else if (resolution === "both") {
            // Insert as new event
            await db.execute({
              sql: `INSERT INTO events (user_id, title, description, due_date, class_id,
                                       event_type, status, notes, url, canvas_id,
                                       points_possible, canvas_due_date_override)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                userId,
                guestEvent.title,
                guestEvent.description || null,
                guestEvent.due_date,
                mappedClassId,
                guestEvent.event_type || null,
                guestEvent.status || "incomplete",
                guestEvent.notes || null,
                guestEvent.url || null,
                null, // Clear canvas_id to avoid conflict
                guestEvent.points_possible || null,
                guestEvent.canvas_due_date_override || 0,
              ],
            });
            mergedEventsCount++;
          }
          // If resolution === 'auth', keep existing - no action needed
        } else {
          // Map guest class_id to authenticated class_id
          const mappedClassId = guestEvent.class_id
            ? classIdMapping[guestEvent.class_id] || null
            : null;

          // No duplicate, insert as new event
          await db.execute({
            sql: `INSERT INTO events (user_id, title, description, due_date, class_id,
                                     event_type, status, notes, url, canvas_id,
                                     points_possible, canvas_due_date_override)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              userId,
              guestEvent.title,
              guestEvent.description || null,
              guestEvent.due_date,
              mappedClassId,
              guestEvent.event_type || null,
              guestEvent.status || "incomplete",
              guestEvent.notes || null,
              guestEvent.url || null,
              guestEvent.canvas_id || null,
              guestEvent.points_possible || null,
              guestEvent.canvas_due_date_override || 0,
            ],
          });
          mergedEventsCount++;
        }
      }
    }

    // 3. Migrate Canvas credentials if guest has them and auth user doesn't
    if (guestSettings?.canvas_url && guestSettings?.canvas_token) {
      // Check if user already has Canvas credentials
      const existingSettings = await db.execute({
        sql: "SELECT canvas_url, canvas_token FROM settings WHERE user_id = ?",
        args: [userId],
      });

      const hasCanvasCredentials =
        existingSettings.rows.length > 0 &&
        existingSettings.rows[0].canvas_url &&
        existingSettings.rows[0].canvas_token;

      // Only migrate if user doesn't have Canvas configured
      if (!hasCanvasCredentials) {
        // Ensure settings record exists
        await db.execute({
          sql: "INSERT OR IGNORE INTO settings (user_id) VALUES (?)",
          args: [userId],
        });

        // Update with guest Canvas credentials
        await db.execute({
          sql: `UPDATE settings
                SET canvas_url = ?, canvas_token = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?`,
          args: [
            guestSettings.canvas_url,
            guestSettings.canvas_token,
            userId,
          ],
        });
      }
    }

    // 4. Insert audit record
    await db.execute({
      sql: `INSERT INTO merge_audit (user_id, guest_session_id, merged_events_count, merged_classes_count)
            VALUES (?, ?, ?, ?)`,
      args: [
        userId,
        guestSessionId || null,
        mergedEventsCount,
        mergedClassesCount,
      ],
    });

    res.json({
      success: true,
      mergedEventsCount,
      mergedClassesCount,
    });
  } catch (err) {
    console.error("Error during merge:", err);
    res.status(500).json({
      message: "Failed to merge data",
      error: err.message,
    });
  }
});

export default router;
