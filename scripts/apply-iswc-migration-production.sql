-- Migration: Add iswcCode column to Song table
-- Run this directly in Supabase SQL Editor or via Supabase CLI

ALTER TABLE "Song" 
ADD COLUMN IF NOT EXISTS "iswcCode" TEXT;



