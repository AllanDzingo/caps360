# CAPS360 AI Microservice & Supabase Edge Functions

## API Endpoints

### Screening Path
- `screening/start` (GET): Returns disclaimer, T&Cs, and screening metadata.
- `screening/questionnaire` (POST): Accepts age, grade, responses, session_id. Returns next questions or null.
- `screening/results` (POST): Accepts session_id and responses. Returns risk score and AI recommendation.

### Study Help Path
- `study/help` (POST): Accepts a study help prompt. Returns AI-generated study content.

All endpoints require a valid Supabase Auth JWT in the `Authorization` header.

## Database Schema
- `screening_sessions`: Tracks each screening attempt, status, timestamps, risk score, recommendation.
- `screening_responses`: Stores individual question responses per session.
- `study_interactions`: Logs study help interactions.

## Integration Steps
1. Deploy Edge Functions to Supabase (see Supabase docs).
2. Run the migration SQL in `backend/supabase/db/20251228_screening_study_tables.sql`.
3. Set environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` for Edge Functions.
4. From frontend, invoke functions using `supabase.functions.invoke`.

## Example Frontend Calls
```ts
// Example: Start screening
const { data } = await supabase.functions.invoke('screening/start', { method: 'GET', headers: { Authorization: `Bearer ${session.access_token}` } });

// Example: Submit screening questionnaire
const { data } = await supabase.functions.invoke('screening/questionnaire', {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: { age: 12, grade: '7', responses: [...], session_id: '...' }
});

// Example: Get screening results
const { data } = await supabase.functions.invoke('screening/results', {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: { session_id: '...', responses: [...] }
});

// Example: Study help
const { data } = await supabase.functions.invoke('study/help', {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: { prompt: 'Explain photosynthesis for Grade 7' }
});
```

## Environment Variables
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for DB access

## Testing Instructions
- Use Supabase CLI or dashboard to deploy and test Edge Functions.
- Use Postman or frontend code to invoke endpoints with a valid JWT.
- Check DB tables for correct data insertion.

---
For more details, see the code in `backend/supabase/functions/` and the migration SQL in `backend/supabase/db/`.
