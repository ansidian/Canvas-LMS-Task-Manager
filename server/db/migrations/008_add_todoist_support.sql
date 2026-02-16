-- Add Todoist integration support

ALTER TABLE settings ADD COLUMN todoist_token TEXT;
ALTER TABLE events ADD COLUMN todoist_id TEXT;
