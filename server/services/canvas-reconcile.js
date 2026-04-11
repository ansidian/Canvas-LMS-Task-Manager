import db from "../db/connection.js";
import { fetchCanvasAssignments } from "./canvas-assignments.js";
import { CONCURRENT_ASSIGNMENT_FETCHES, mapLimit } from "./canvas-api.js";

const CLASS_COLORS = [
  "#228be6",
  "#fa5252",
  "#fab005",
  "#15aabf",
  "#e64980",
  "#fd7e14",
  "#20c997",
];

function parseCanvasIds(canvasId) {
  if (!canvasId || typeof canvasId !== "string") return null;
  const [courseId, assignmentId] = canvasId.split("-");
  if (!courseId || !assignmentId) return null;
  return { courseId, assignmentId };
}

async function ensureClassesExist(userId, canvasCourses) {
  const existing = await db.execute({
    sql: "SELECT * FROM classes WHERE user_id = ?",
    args: [userId],
  });

  const byCanvasId = new Map();
  const byName = new Map();
  for (const cls of existing.rows) {
    if (cls.canvas_course_id) byCanvasId.set(cls.canvas_course_id, cls);
    byName.set(String(cls.name).toLowerCase(), cls);
  }

  let nextSortOrder = null;
  const getNextSortOrder = async () => {
    if (nextSortOrder !== null) return nextSortOrder++;
    const max = await db.execute({
      sql: "SELECT COALESCE(MAX(sort_order), -1) AS m FROM classes WHERE user_id = ?",
      args: [userId],
    });
    nextSortOrder = Number(max.rows[0]?.m ?? -1) + 1;
    return nextSortOrder++;
  };

  for (const course of canvasCourses) {
    const { canvas_course_id, name } = course;
    if (byCanvasId.has(canvas_course_id)) continue;

    const match = byName.get(String(name).toLowerCase());
    if (match && !match.canvas_course_id) {
      await db.execute({
        sql: "UPDATE classes SET canvas_course_id = ? WHERE id = ? AND user_id = ?",
        args: [canvas_course_id, match.id, userId],
      });
    } else if (!match) {
      const sortOrder = await getNextSortOrder();
      await db.execute({
        sql: "INSERT INTO classes (user_id, name, color, canvas_course_id, sort_order) VALUES (?, ?, ?, ?, ?)",
        args: [
          userId,
          name,
          CLASS_COLORS[Math.floor(Math.random() * CLASS_COLORS.length)],
          canvas_course_id,
          sortOrder,
        ],
      });
    }
  }
}

async function fetchQuizSubmission(canvasBaseUrl, canvasToken, ids) {
  try {
    const res = await fetch(
      `${canvasBaseUrl}/api/v1/courses/${ids.courseId}/assignments/${ids.assignmentId}/submissions/self`,
      { headers: { Authorization: `Bearer ${canvasToken}` } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Failed to fetch Canvas submission:", err);
    return null;
  }
}

export async function runCanvasSync({
  userId,
  canvasBaseUrl,
  canvasToken,
  autoApprove = false,
}) {
  const { allAssignments, canvasCourses } = await fetchCanvasAssignments(
    canvasBaseUrl,
    canvasToken,
  );

  await ensureClassesExist(userId, canvasCourses);

  const [classesRes, eventsRes, rejectedRes] = await Promise.all([
    db.execute({
      sql: "SELECT * FROM classes WHERE user_id = ?",
      args: [userId],
    }),
    db.execute({
      sql: "SELECT id, canvas_id, due_date, status, canvas_due_date_override, canvas_status_override FROM events WHERE user_id = ? AND canvas_id IS NOT NULL",
      args: [userId],
    }),
    db.execute({
      sql: "SELECT canvas_id FROM rejected_items WHERE user_id = ?",
      args: [userId],
    }),
  ]);

  const classes = classesRes.rows;
  const events = eventsRes.rows;
  const classByCanvasCourse = new Map(
    classes
      .filter((c) => c.canvas_course_id)
      .map((c) => [c.canvas_course_id, c]),
  );
  const existingCanvasIds = new Set(events.map((e) => e.canvas_id));
  const rejectedCanvasIds = new Set(rejectedRes.rows.map((r) => r.canvas_id));

  const syncedAssignments = allAssignments.filter((a) => {
    const cls = classByCanvasCourse.get(a.canvas_course_id);
    return !cls || cls.is_synced;
  });

  const submittedItems = syncedAssignments.filter(
    (a) =>
      a.has_submitted &&
      !existingCanvasIds.has(a.canvas_id) &&
      !rejectedCanvasIds.has(a.canvas_id),
  );

  for (const item of submittedItems) {
    const classId = classByCanvasCourse.get(item.canvas_course_id)?.id ?? null;
    await db.execute({
      sql: `INSERT INTO events (user_id, title, description, due_date, class_id, event_type, status, notes, url, canvas_id, points_possible, canvas_due_date_override)
            VALUES (?, ?, ?, ?, ?, 'assignment', 'complete', '', ?, ?, ?, 0)`,
      args: [
        userId,
        item.title,
        item.description ?? null,
        item.due_date,
        classId,
        item.url,
        item.canvas_id,
        item.points_possible ?? null,
      ],
    });
  }

  const assignmentByCanvasId = new Map(
    allAssignments.map((a) => [a.canvas_id, a]),
  );
  const dueDateUpdates = [];
  const quizTargets = [];
  for (const event of events) {
    const assignment = assignmentByCanvasId.get(event.canvas_id);
    if (!assignment?.due_date) continue;

    if (
      !event.canvas_due_date_override &&
      event.due_date !== assignment.due_date
    ) {
      dueDateUpdates.push({ id: event.id, due_date: assignment.due_date });
    }

    if (
      event.status !== "complete" &&
      assignment.quiz_id &&
      !event.canvas_status_override
    ) {
      const ids = parseCanvasIds(event.canvas_id);
      if (ids) quizTargets.push({ id: event.id, ids });
    }
  }

  for (const u of dueDateUpdates) {
    await db.execute({
      sql: "UPDATE events SET due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      args: [u.due_date, u.id, userId],
    });
  }

  const quizResults = await mapLimit(
    quizTargets,
    CONCURRENT_ASSIGNMENT_FETCHES,
    async ({ id, ids }) => {
      const sub = await fetchQuizSubmission(canvasBaseUrl, canvasToken, ids);
      return sub?.submitted_at ? id : null;
    },
  );
  const completedEventIds = quizResults.filter((id) => id != null);
  for (const id of completedEventIds) {
    await db.execute({
      sql: "UPDATE events SET status = 'complete', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
  }

  const postSyncCanvasIds = new Set(existingCanvasIds);
  for (const item of submittedItems) postSyncCanvasIds.add(item.canvas_id);

  const candidatePending = syncedAssignments.filter(
    (a) =>
      !a.has_submitted &&
      !postSyncCanvasIds.has(a.canvas_id) &&
      !rejectedCanvasIds.has(a.canvas_id),
  );

  let autoApprovedCount = 0;
  let pendingAssignments = candidatePending;
  if (autoApprove && candidatePending.length > 0) {
    for (const item of candidatePending) {
      const classId =
        classByCanvasCourse.get(item.canvas_course_id)?.id ?? null;
      await db.execute({
        sql: `INSERT INTO events (user_id, title, description, due_date, class_id, event_type, status, notes, url, canvas_id, points_possible, canvas_due_date_override)
              VALUES (?, ?, ?, ?, ?, 'assignment', 'incomplete', '', ?, ?, ?, 0)`,
        args: [
          userId,
          item.title,
          item.description ?? null,
          item.due_date,
          classId,
          item.url,
          item.canvas_id,
          item.points_possible ?? null,
        ],
      });
      autoApprovedCount += 1;
    }
    pendingAssignments = [];
  }

  return {
    pendingAssignments,
    canvasCourses,
    allAssignments,
    stats: {
      approved: submittedItems.length,
      autoApproved: autoApprovedCount,
      dueDateUpdates: dueDateUpdates.length,
      quizCompleted: completedEventIds.length,
    },
  };
}
