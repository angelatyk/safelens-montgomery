-- Migration 013: Add title column to narratives table
ALTER TABLE public.narratives
  ADD COLUMN title text;