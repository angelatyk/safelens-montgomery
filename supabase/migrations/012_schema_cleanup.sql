-- Migration 012: Schema cleanup — feedback target constraint + resident_reports status constraint

-- 1. Add missing feedback_target_check constraint to narrative_feedback
ALTER TABLE public.narrative_feedback
  ADD CONSTRAINT feedback_target_check
    CHECK (incident_id IS NOT NULL OR narrative_id IS NOT NULL);

-- 2. Lock resident_reports status to valid values
ALTER TABLE public.resident_reports
  ADD CONSTRAINT resident_reports_status_check
    CHECK (status IN ('submitted', 'verified', 'resolved'));