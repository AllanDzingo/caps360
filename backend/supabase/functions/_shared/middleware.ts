// Shared middleware for Supabase Edge Functions
import { createClient } from "./supabaseClient.ts";

export function withCORS(handler: any) {
  return async (req: Request, ctx: any) => {
    const resp = await handler(req, ctx);
    resp.headers.set("Access-Control-Allow-Origin", "*");
    resp.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    resp.headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
    return resp;
  };
}

export function withAuth(handler: any) {
  return async (req: Request, ctx: any) => {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    ctx.user = user;
    return handler(req, ctx);
  };
}
