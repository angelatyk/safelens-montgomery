-- Neighborhoods
create table neighborhoods (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  geojson jsonb,
  avg_incident_rate numeric default 0,
  safety_score numeric default 0
);

-- Incidents
create table incidents (
  id uuid default gen_random_uuid() primary key,
  source text not null,
  type text not null,
  lat numeric,
  lng numeric,
  neighborhood_id uuid references neighborhoods(id),
  occurred_at timestamptz,
  raw_data jsonb,
  created_at timestamptz default now()
);

-- News Articles
create table news_articles (
  id uuid default gen_random_uuid() primary key,
  headline text not null,
  source text,
  url text,
  published_at timestamptz,
  relevance_score numeric default 0,
  matched_incident_ids uuid[],
  created_at timestamptz default now()
);

-- Resident Reports
create table resident_reports (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  description text,
  lat numeric,
  lng numeric,
  status text default 'submitted',
  verified_by uuid,
  verified_at timestamptz,
  official_response text,
  created_at timestamptz default now()
);

-- Alerts
create table alerts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null,
  severity text default 'info',
  neighborhoods uuid[],
  created_by uuid,
  created_at timestamptz default now(),
  is_active boolean default true
);

-- Narratives
create table narratives (
  id uuid default gen_random_uuid() primary key,
  neighborhood_id uuid references neighborhoods(id),
  content text not null,
  generated_at timestamptz default now(),
  model_used text,
  source_data_hash text
);

-- Users
create table users (
  id uuid references auth.users(id) primary key,
  role text default 'resident',
  email text,
  created_at timestamptz default now()
);