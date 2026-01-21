-- Store Canvas credentials in settings instead of localStorage

ALTER TABLE settings ADD COLUMN canvas_url TEXT;
ALTER TABLE settings ADD COLUMN canvas_token TEXT;
