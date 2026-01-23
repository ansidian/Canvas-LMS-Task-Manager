import { Router } from "express";
import multer from "multer";
import db from "../db/connection.js";
import { requireUser } from "../middleware/clerk-auth.js";
import { validateCanvasCredentials } from "../middleware/canvas-auth.js";
import { fetchCanvasAssignments } from "../services/canvas-assignments.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});

router.use(requireUser());

// Fetch assignments from Canvas
router.get(
  "/assignments",
  validateCanvasCredentials({ stripApiPath: true }),
  async (req, res) => {
    const userId = req.auth().userId;

    try {
      const { allAssignments, canvasCourses } = await fetchCanvasAssignments(
        req.canvasBaseUrl,
        req.canvasToken,
      );

      // Filter out already approved or rejected items for this user
      const existingEvents = await db.execute({
        sql: "SELECT canvas_id FROM events WHERE user_id = ? AND canvas_id IS NOT NULL",
        args: [userId],
      });
      const rejectedItems = await db.execute({
        sql: "SELECT canvas_id FROM rejected_items WHERE user_id = ?",
        args: [userId],
      });

      const existingIds = new Set([
        ...existingEvents.rows.map((r) => r.canvas_id),
        ...rejectedItems.rows.map((r) => r.canvas_id),
      ]);

      const pendingAssignments = allAssignments.filter(
        (a) => !existingIds.has(a.canvas_id),
      );

      res.json({
        assignments: pendingAssignments,
        courses: canvasCourses,
        allAssignments,
      });
    } catch (err) {
      console.error("Error fetching Canvas assignments:", err);
      if (err?.message?.includes("Canvas API error: 401")) {
        res.status(401).json({ message: "Canvas credentials invalid" });
      } else if (
        err?.message?.includes("Canvas API error: invalid response") ||
        err?.message?.includes("Canvas API error: network")
      ) {
        res.status(400).json({ message: "Canvas base URL invalid" });
      } else {
        res.status(500).json({ message: "Failed to fetch Canvas assignments" });
      }
    }
  },
);

// Fetch assignment details from Canvas
router.get("/assignment", validateCanvasCredentials(), async (req, res) => {
  const { courseId, assignmentId } = req.query;

  if (!courseId || !assignmentId) {
    return res
      .status(400)
      .json({ message: "courseId and assignmentId required" });
  }

  try {
    const assignmentRes = await fetch(
      `${req.canvasBaseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}`,
      {
        headers: {
          Authorization: `Bearer ${req.canvasToken}`,
          "Accept-Language": "en-US",
        },
      },
    );

    if (!assignmentRes.ok) {
      throw new Error(`Canvas API error: ${assignmentRes.status}`);
    }

    const assignment = await assignmentRes.json();
    res.json({
      id: assignment.id,
      name: assignment.name,
      description: assignment.description || null,
      submission_types: assignment.submission_types || [],
      allowed_extensions: assignment.allowed_extensions || [],
      locked_for_user: !!assignment.locked_for_user,
      lock_explanation: assignment.lock_explanation || null,
      quiz_id: assignment.quiz_id || null,
      due_at: assignment.due_at || null,
    });
  } catch (err) {
    console.error("Error fetching Canvas assignment:", err);
    res.status(500).json({ message: "Failed to fetch Canvas assignment" });
  }
});

// Fetch current submission for assignment
router.get(
  "/submissions/self",
  validateCanvasCredentials(),
  async (req, res) => {
    const { courseId, assignmentId } = req.query;

    if (!courseId || !assignmentId) {
      return res
        .status(400)
        .json({ message: "courseId and assignmentId required" });
    }

    try {
      const submissionRes = await fetch(
        `${req.canvasBaseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self`,
        { headers: { Authorization: `Bearer ${req.canvasToken}` } },
      );

      if (!submissionRes.ok) {
        throw new Error(`Canvas API error: ${submissionRes.status}`);
      }

      const submission = await submissionRes.json();
      res.json(submission);
    } catch (err) {
      console.error("Error fetching Canvas submission:", err);
      res.status(500).json({ message: "Failed to fetch Canvas submission" });
    }
  },
);

// Submit non-file assignments (text entry, URL)
router.post(
  "/submissions/submit",
  validateCanvasCredentials(),
  async (req, res) => {
    const { courseId, assignmentId, submissionType, body, url, comment } =
      req.body;

    if (!courseId || !assignmentId || !submissionType) {
      return res.status(400).json({
        message: "courseId, assignmentId, and submissionType required",
      });
    }

    try {
      const submitParams = new URLSearchParams();
      submitParams.append("submission[submission_type]", submissionType);

      if (submissionType === "online_text_entry") {
        submitParams.append("submission[body]", body || "");
      } else if (submissionType === "online_url") {
        submitParams.append("submission[url]", url || "");
      }

      if (comment) {
        submitParams.append("submission[comment][text_comment]", comment);
        submitParams.append("submission[comment]", comment);
      }

      const submitRes = await fetch(
        `${req.canvasBaseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${req.canvasToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: submitParams.toString(),
        },
      );

      if (!submitRes.ok) {
        throw new Error(`Canvas submission failed: ${submitRes.status}`);
      }

      const submission = await submitRes.json();

      let verifiedSubmission = submission;
      try {
        const verifyRes = await fetch(
          `${req.canvasBaseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self`,
          { headers: { Authorization: `Bearer ${req.canvasToken}` } },
        );
        if (verifyRes.ok) {
          verifiedSubmission = await verifyRes.json();
        }
      } catch (err) {
        console.warn("Canvas submission verification failed:", err);
      }

      res.json({ submission: verifiedSubmission });
    } catch (err) {
      console.error("Error submitting Canvas assignment:", err);
      res.status(500).json({ message: "Failed to submit Canvas assignment" });
    }
  },
);

// Upload file(s) and submit assignment
router.post(
  "/submissions/upload",
  validateCanvasCredentials(),
  upload.array("files"),
  async (req, res) => {
    const { courseId, assignmentId, comment } = req.body;
    const files = req.files || [];

    if (!courseId || !assignmentId) {
      return res
        .status(400)
        .json({ message: "courseId and assignmentId required" });
    }
    if (!files.length) {
      return res.status(400).json({ message: "At least one file is required" });
    }

    try {
      const fileIds = [];

      for (const file of files) {
        const preflightRes = await fetch(
          `${req.canvasBaseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self/files`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${req.canvasToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: file.originalname,
              size: file.size,
              content_type: file.mimetype || "application/octet-stream",
            }),
          },
        );

        if (!preflightRes.ok) {
          throw new Error(
            `Canvas upload preflight failed: ${preflightRes.status}`,
          );
        }

        const preflight = await preflightRes.json();
        if (!preflight.upload_url || !preflight.upload_params) {
          throw new Error("Canvas upload preflight missing upload_url");
        }

        const form = new FormData();
        for (const [key, value] of Object.entries(preflight.upload_params)) {
          form.append(key, value);
        }
        const blob = new Blob([file.buffer], {
          type: file.mimetype || "application/octet-stream",
        });
        form.append("file", blob, file.originalname);

        const uploadRes = await fetch(preflight.upload_url, {
          method: "POST",
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
          throw new Error("Canvas upload response missing file id");
        }
        fileIds.push(fileId);
      }

      const submitParams = new URLSearchParams();
      submitParams.append("submission[submission_type]", "online_upload");
      for (const fileId of fileIds) {
        submitParams.append("submission[file_ids][]", String(fileId));
      }
      if (comment) {
        submitParams.append("submission[comment][text_comment]", comment);
        submitParams.append("submission[comment]", comment);
      }

      const submitRes = await fetch(
        `${req.canvasBaseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${req.canvasToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: submitParams.toString(),
        },
      );

      if (!submitRes.ok) {
        throw new Error(`Canvas submission failed: ${submitRes.status}`);
      }

      const submission = await submitRes.json();

      let verifiedSubmission = submission;
      try {
        const verifyRes = await fetch(
          `${req.canvasBaseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self`,
          { headers: { Authorization: `Bearer ${req.canvasToken}` } },
        );
        if (verifyRes.ok) {
          verifiedSubmission = await verifyRes.json();
        }
      } catch (err) {
        console.warn("Canvas submission verification failed:", err);
      }

      res.json({ submission: verifiedSubmission, file_ids: fileIds });
    } catch (err) {
      console.error("Error submitting Canvas assignment:", err);
      res.status(500).json({ message: "Failed to submit Canvas assignment" });
    }
  },
);

export default router;
