// Shared Supabase client for Edge Functions
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export function createClient() {
  return createSupabaseClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
}
