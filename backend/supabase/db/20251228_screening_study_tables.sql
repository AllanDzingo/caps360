-- CAPS360 AI Microservice: Screening & Study Help Tables

-- Reference: users table from Supabase Auth

create table if not exists screening_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  started_at timestamptz default now(),
  completed_at timestamptz,
  status text default 'in_progress',
  risk_score int,
  recommendation text
);

create table if not exists screening_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references screening_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  question_id text,
  response jsonb,
  created_at timestamptz default now()
);

create table if not exists study_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  prompt text,
  ai_response text,
  created_at timestamptz default now()
);
