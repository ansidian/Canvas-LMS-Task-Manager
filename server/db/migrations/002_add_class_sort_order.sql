-- Add sort_order column to classes table for drag-to-reorder functionality

ALTER TABLE classes ADD COLUMN sort_order INTEGER DEFAULT 0;