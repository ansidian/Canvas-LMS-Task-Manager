import {
  CONCURRENT_ASSIGNMENT_FETCHES,
  fetchAllPages,
  mapLimit,
} from "./canvas-api.js";

export async function fetchCanvasAssignments(canvasBaseUrl, canvasToken) {
  const headers = { Authorization: `Bearer ${canvasToken}` };
  const courses = await fetchAllPages(
    `${canvasBaseUrl}/api/v1/courses?enrollment_state=active&per_page=100`,
    headers,
  );

  const allAssignments = [];

  const assignmentResults = await mapLimit(
    courses,
    CONCURRENT_ASSIGNMENT_FETCHES,
    async (course) => {
      try {
        const assignments = await fetchAllPages(
          `${canvasBaseUrl}/api/v1/courses/${course.id}/assignments?per_page=100&include[]=submission`,
          headers,
        );
        return { course, assignments };
      } catch (err) {
        console.error(`Error fetching assignments for course ${course.id}:`, err);
        return { course, assignments: [] };
      }
    },
  );

  for (const { course, assignments } of assignmentResults) {
    const courseIdStr = String(course.id);
    for (const assignment of assignments) {
      if (assignment.due_at) {
        const submissionState = assignment.submission?.workflow_state;
        const hasSubmitted = ["submitted", "graded", "pending_review"].includes(
          submissionState,
        );
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
          has_submitted: hasSubmitted,
          unlock_at: assignment.unlock_at || null,
          locked_for_user: !!assignment.locked_for_user,
        });
      }
    }
  }

  const canvasCourses = courses.map((course) => ({
    canvas_course_id: String(course.id),
    name: course.name,
  }));

  return { allAssignments, canvasCourses };
}
