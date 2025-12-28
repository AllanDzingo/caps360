// Shared study help helpers
import { createClient } from "./supabaseClient.ts";
import { aiStudyHelp } from "./ai.ts";

export async function logStudyInteraction(user_id: string, prompt: string, aiResponse: string) {
  const supabase = createClient();
  await supabase.from("study_interactions").insert({ user_id, prompt, ai_response: aiResponse });
}

export { aiStudyHelp };
