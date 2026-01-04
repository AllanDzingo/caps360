-- CAPS360: Azure PostgreSQL Migration Schema
-- Export your Supabase schema and data, then import here

-- Example: users table (edit as needed)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL,
    grade INTEGER,
    subjects TEXT[],
    current_tier TEXT NOT NULL,
    trial_premium BOOLEAN DEFAULT FALSE,
    trial_end_date TIMESTAMP,
    welcome_premium BOOLEAN DEFAULT FALSE,
    welcome_premium_end_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Repeat for all other tables (subscriptions, courses, lessons, quizzes, assignments, analytics, ai_conversations, payments)
-- You can use the schema in backend/supabase/db/20251228_screening_study_tables.sql as a base

-- After schema, use \copy or INSERTs to import data
