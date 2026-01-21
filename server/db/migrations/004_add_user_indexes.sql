-- Add indexes to speed up common user_id queries

CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_canvas_id ON events(user_id, canvas_id);
CREATE INDEX IF NOT EXISTS idx_rejected_items_user_id ON rejected_items(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
