// Supabase Edge Function: screening/questionnaire
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withAuth, withCORS } from "../_shared/middleware.ts";
import { saveScreeningResponse, getScreeningQuestions } from "../_shared/screening.ts";

serve(withCORS(withAuth(async (req, ctx) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  const { age, grade, responses, session_id } = await req.json();
  if (!age || !grade || !responses || !session_id) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  // Save responses
  await saveScreeningResponse(ctx.user.id, session_id, responses);
  // Get next questions (or null if done)
  const nextQuestions = getScreeningQuestions(age, grade, responses);
  return Response.json({ nextQuestions });
})));
