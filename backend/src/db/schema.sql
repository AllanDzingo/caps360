-- Enable UUID extension (Not needed for gen_random_uuid in PG 13+)
-- create extension if not exists "uuid-ossp";

-- USERS Table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  first_name text,
  last_name text,
  role text check (role in ('student', 'parent', 'teacher', 'admin')),
  grade integer,
  subjects text[], -- Array of strings
  children_ids text[], -- Array of user IDs (for parents)
  subscription_id uuid,
  current_tier text default 'study_help',
  trial_premium boolean default false,
  trial_end_date timestamptz,
  welcome_premium boolean default false,
  welcome_premium_end_date timestamptz,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- COURSES Table
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade integer,
  subject text,
  thumbnail_url text,
  access_tier text default 'study_help',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TOPICS Table
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) not null,
  title text not null,
  description text,
  "order" integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LESSONS Table
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id), -- Keeping for backward compatibility/direct access
  topic_id uuid references public.topics(id), -- New hierarchy
  title text not null,
  content text, -- Markdown or HTML content
  video_url text,
  pdf_urls text[],
  "order" integer,
  access_tier text default 'study_help',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- QUIZZES Table
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text,
  questions jsonb, -- Array of question objects with difficulty/cognitive_level
  total_questions integer,
  passing_score integer,
  access_tier text,
  
  -- Adaptive Fields
  adaptive boolean default false,
  difficulty_start integer default 2,
  difficulty_max integer default 5,
  time_limit_minutes integer default 10,
  adaptive_rules jsonb, -- { increaseAfter: 2, decreaseAfter: 2 }

  ai_generated boolean default false,
  generated_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- QUIZ ATTEMPTS Table (Detailed history)
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) not null,
  quiz_id uuid references public.quizzes(id) not null,
  score integer,
  mastery_level text, -- 'Needs Support', 'Developing', 'Proficient', 'Mastery'
  difficulty_reached integer,
  answers jsonb, -- detailed log of answers given
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- PROGRESS Tables (Must come after Lessons/Topics/Courses)
create table if not exists public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) not null,
  lesson_id uuid references public.lessons(id) not null,
  status text check (status in ('started', 'completed')) default 'started',
  quiz_score integer, -- percentage 0-100
  started_at timestamptz default now(),
  completed_at timestamptz,
  updated_at timestamptz default now(),
  unique(user_id, lesson_id)
);

create table if not exists public.user_topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) not null,
  topic_id uuid references public.topics(id) not null,
  percent_complete integer default 0,
  updated_at timestamptz default now(),
  unique(user_id, topic_id)
);

create table if not exists public.user_subject_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) not null,
  course_id uuid references public.courses(id) not null,
  percent_complete integer default 0,
  updated_at timestamptz default now(),
  unique(user_id, course_id)
);

-- SUBSCRIPTIONS Table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  tier text,
  status text,
  payment_provider text,
  paystack_subscription_id text,
  paystack_customer_code text,
  amount integer, -- in cents
  currency text default 'ZAR',
  billing_cycle text,
  start_date timestamptz,
  next_billing_date timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PAYMENTS Table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  provider text,
  amount integer,
  currency text default 'ZAR',
  status text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AI_CONVERSATIONS Table
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  messages jsonb, -- Array of message objects
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ANALYTICS Table
create table if not exists public.analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  event_type text,
  metadata jsonb,
  user_tier text,
  user_role text,
  timestamp timestamptz default now()
);

-- COMMUNICATION SYSTEM Tables

create table if not exists public.communication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  type text check (type in ('WELCOME', 'RESET', 'WEEKLY_SUMMARY', 'INACTIVITY')),
  status text check (status in ('SENT', 'FAILED')),
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  token_hash text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

