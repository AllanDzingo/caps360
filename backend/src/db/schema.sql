-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS Table
create table public.users (
  id uuid primary key default uuid_generate_v4(),
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

-- SUBSCRIPTIONS Table
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
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
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  provider text,
  amount integer,
  currency text default 'ZAR',
  status text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- COURSES Table
create table public.courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  grade integer,
  subject text,
  thumbnail_url text,
  access_tier text default 'study_help',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LESSONS Table
create table public.lessons (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses(id),
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
create table public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  title text,
  questions jsonb, -- Array of question objects
  total_questions integer,
  passing_score integer,
  access_tier text,
  ai_generated boolean default false,
  generated_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AI_CONVERSATIONS Table
create table public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  messages jsonb, -- Array of message objects
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ANALYTICS Table
create table public.analytics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  event_type text,
  metadata jsonb,
  user_tier text,
  user_role text,
  timestamp timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.quizzes enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.analytics enable row level security;

-- Basic Policies (Adjust as needed)
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Public read courses" on public.courses for select using (true);
create policy "Public read lessons" on public.lessons for select using (true);
