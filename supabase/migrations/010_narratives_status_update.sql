-- Update narratives status column
-- Drops 'pending' in favor of cleaner 3-state lifecycle: active, verified, resolved

-- Update any existing 'pending' rows to 'active'
UPDATE public.narratives SET status = 'active' WHERE status = 'pending';

-- Change default from 'pending' to 'active'
ALTER TABLE public.narratives
  ALTER COLUMN status SET DEFAULT 'active';

-- Add check constraint locking status to the three valid values
ALTER TABLE public.narratives
  ADD CONSTRAINT narratives_status_check
    CHECK (status IN ('active', 'verified', 'resolved'));