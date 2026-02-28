-- Add retry_count to reminders for rate-limit resilience
ALTER TABLE reminders ADD COLUMN retry_count INTEGER DEFAULT 0;
