import { runCanvasSync } from "../../server/services/canvas-reconcile.js";
import db from "../../server/db/connection.js";
import {
  isTransientCanvasError,
  normalizeCanvasBaseUrl,
  normalizeCanvasToken,
} from "../../server/services/canvas-api.js";

const result = await db.execute(
  "SELECT user_id, canvas_url, canvas_token, auto_approve_canvas FROM settings WHERE canvas_url IS NOT NULL AND canvas_url != '' AND canvas_token IS NOT NULL AND canvas_token != ''",
);

if (result.rows.length === 0) {
  console.log("No users with Canvas credentials — nothing to sync.");
  process.exit(0);
}

console.log(`Syncing Canvas for ${result.rows.length} user(s)...`);

let successCount = 0;
let transientFailCount = 0;
let permanentFailCount = 0;

for (const row of result.rows) {
  const userId = row.user_id;
  try {
    const canvasBaseUrl = normalizeCanvasBaseUrl(row.canvas_url, {
      stripApiPath: true,
    });
    const canvasToken = normalizeCanvasToken(row.canvas_token);
    const stats = await runCanvasSync({
      userId,
      canvasBaseUrl,
      canvasToken,
      autoApprove: Boolean(row.auto_approve_canvas),
    });
    console.log(
      `[${userId}] ok — approved:${stats.stats.approved} auto:${stats.stats.autoApproved} due:${stats.stats.dueDateUpdates} quiz:${stats.stats.quizCompleted}`,
    );
    successCount += 1;
  } catch (err) {
    const transient = isTransientCanvasError(err);
    console.error(
      `[${userId}] ${transient ? "transient failure" : "failed"}:`,
      err?.message || err,
    );
    if (transient) {
      transientFailCount += 1;
    } else {
      permanentFailCount += 1;
    }
  }
}

const failCount = transientFailCount + permanentFailCount;
console.log(
  `Done — ${successCount} ok, ${failCount} failed (${transientFailCount} transient, ${permanentFailCount} permanent).`,
);

if (permanentFailCount === 0 && transientFailCount > 0) {
  console.warn(
    "Only transient Canvas failures occurred; leaving scheduled workflow green.",
  );
}

process.exit(permanentFailCount > 0 ? 1 : 0);
