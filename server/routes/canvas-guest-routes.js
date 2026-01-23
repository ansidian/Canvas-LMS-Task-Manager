import { Router } from "express";
import { validateCanvasCredentials } from "../middleware/canvas-auth.js";
import { fetchCanvasAssignments } from "../services/canvas-assignments.js";

const router = Router();

// Fetch assignments from Canvas (guest access)
router.get(
  "/assignments",
  validateCanvasCredentials({ stripApiPath: true }),
  async (req, res) => {
    try {
      const { allAssignments, canvasCourses } = await fetchCanvasAssignments(
        req.canvasBaseUrl,
        req.canvasToken,
      );

      res.json({
        assignments: allAssignments,
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

// Fetch current submission for assignment (guest access)
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

// Fetch assignment details from Canvas (guest access)
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

export default router;
