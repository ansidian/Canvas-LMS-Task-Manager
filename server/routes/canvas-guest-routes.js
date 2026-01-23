import { Router } from "express";
import {
  CONCURRENT_ASSIGNMENT_FETCHES,
  fetchAllPages,
  mapLimit,
} from "../services/canvas-api.js";
import { validateCanvasCredentials } from "../middleware/canvas-auth.js";

const router = Router();

// Fetch assignments from Canvas (guest access)
router.get(
  "/assignments",
  validateCanvasCredentials({ stripApiPath: true }),
  async (req, res) => {
    try {
      const headers = { Authorization: `Bearer ${req.canvasToken}` };
      const courses = await fetchAllPages(
        `${req.canvasBaseUrl}/api/v1/courses?enrollment_state=active&per_page=100`,
        headers,
      );

      const allAssignments = [];

      const assignmentResults = await mapLimit(
        courses,
        CONCURRENT_ASSIGNMENT_FETCHES,
        async (course) => {
          try {
            const assignments = await fetchAllPages(
              `${req.canvasBaseUrl}/api/v1/courses/${course.id}/assignments?per_page=100`,
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
              due_date: assignment.due_at,
              course_name: course.name,
              url: assignment.html_url,
              description: assignment.description,
              points_possible: assignment.points_possible,
              quiz_id: assignment.quiz_id || null,
            });
          }
        }
      }

      const canvasCourses = courses.map((course) => ({
        canvas_course_id: String(course.id),
        name: course.name,
      }));

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

export default router;
