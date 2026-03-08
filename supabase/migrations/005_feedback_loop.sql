-- Feedback loop tables for NLP pipeline learning
-- Run this when ready to enable user feedback on incidents.
-- The NLP pipeline will auto-detect these tables and use them.

-- Source Reputation: tracks how reliable each news source is
create table if not exists source_reputation (
  id uuid default gen_random_uuid() primary key,
  source_name text unique not null,
  accuracy_score numeric default 50,    -- 0-100, starts neutral at 50
  total_votes integer default 0,
  accurate_votes integer default 0,
  not_relevant_votes integer default 0,
  updated_at timestamptz default now()
);

-- Incident Feedback: user votes on incidents
create table if not exists incident_feedback (
  id uuid default gen_random_uuid() primary key,
  incident_id uuid references incidents(id),
  user_id uuid,
  vote text not null check (vote in ('accurate', 'not_relevant')),
  created_at timestamptz default now()
);
