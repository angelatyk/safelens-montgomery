-- Migration 015: Narrative linkage counts
ALTER TABLE public.narratives
  ADD COLUMN incident_count integer DEFAULT 0 NOT NULL,
  ADD COLUMN news_count integer DEFAULT 0 NOT NULL;
