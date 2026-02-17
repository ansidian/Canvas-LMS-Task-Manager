-- Add unique constraint to prevent duplicate canvas classes per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_user_canvas_course
  ON classes (user_id, canvas_course_id)
  WHERE canvas_course_id IS NOT NULL;
