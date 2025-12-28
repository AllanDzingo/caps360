// Supabase Edge Function: screening/start
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withAuth, withCORS } from "../_shared/middleware.ts";

serve(withCORS(withAuth(async (req, ctx) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  return Response.json({
    disclaimer: "CAPS360 screening is for educational guidance only. It is not a diagnosis. For concerns, consult a qualified psychologist.",
    terms: "By proceeding, you accept CAPS360's Terms & Conditions and consent to data processing for educational purposes.",
    metadata: {
      version: "1.0",
      date: new Date().toISOString(),
      screening: "educational_psychology"
    }
  });
})));
