-- Migration: Create ingredient_avoid_profiles table for optional Avoid List sync
-- Location: supabase/migrations/01_ingredient_avoid_profiles.sql

CREATE TABLE ingredient_avoid_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avoid_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE ingredient_avoid_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own profile
CREATE POLICY "Users can select own avoid profile"
  ON ingredient_avoid_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own avoid profile"
  ON ingredient_avoid_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own avoid profile"
  ON ingredient_avoid_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own avoid profile"
  ON ingredient_avoid_profiles
  FOR DELETE
  USING (auth.uid() = user_id);
