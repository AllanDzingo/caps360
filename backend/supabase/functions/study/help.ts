// Supabase Edge Function: study/help
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withAuth, withCORS } from "../_shared/middleware.ts";
import { aiStudyHelp, logStudyInteraction } from "../_shared/study.ts";

serve(withCORS(withAuth(async (req, ctx) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  const { prompt } = await req.json();
  if (!prompt) {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }
  const aiResponse = await aiStudyHelp(prompt, ctx.user);
  await logStudyInteraction(ctx.user.id, prompt, aiResponse);
  return Response.json({ result: aiResponse });
})));
