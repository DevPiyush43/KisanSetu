-- Migration: Add quality assessment fields to lots table
-- Run this in Supabase SQL Editor

ALTER TABLE lots ADD COLUMN IF NOT EXISTS moisture_content text;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS foreign_matter text;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS damage_percent text;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS harvest_date date;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS storage_method text;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS quality_score integer;
