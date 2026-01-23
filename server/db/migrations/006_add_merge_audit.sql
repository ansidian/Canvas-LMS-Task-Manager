-- Track guest-to-authenticated merge operations for auditing and debugging

CREATE TABLE IF NOT EXISTS merge_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  guest_session_id TEXT,
  merged_events_count INTEGER DEFAULT 0,
  merged_classes_count INTEGER DEFAULT 0,
  merged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying by user and date
CREATE INDEX IF NOT EXISTS idx_merge_audit_user_id ON merge_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_merge_audit_merged_at ON merge_audit(merged_at);
