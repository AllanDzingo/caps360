// Supabase Edge Function: screening/results
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withAuth, withCORS } from "../_shared/middleware.ts";
import { interpretScreeningResults, saveScreeningSession } from "../_shared/screening.ts";

serve(withCORS(withAuth(async (req, ctx) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  const { session_id, responses } = await req.json();
  if (!session_id || !responses) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  // AI interpretation
  const { riskScore, recommendation } = await interpretScreeningResults(responses);
  // Save session result
  await saveScreeningSession(ctx.user.id, session_id, riskScore, recommendation);
  return Response.json({ riskScore, recommendation });
})));
