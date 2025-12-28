// Shared screening helpers
import { createClient } from "./supabaseClient.ts";
import { aiScreeningInterpret } from "./ai.ts";

export async function saveScreeningResponse(user_id: string, session_id: string, responses: any) {
  const supabase = createClient();
  await supabase.from("screening_responses").insert({ user_id, session_id, responses });
}

export function getScreeningQuestions(age: number, grade: string, responses: any) {
  // TODO: Implement adaptive question logic
  // For now, return null to indicate end
  return null;
}

export async function interpretScreeningResults(responses: any) {
  // Call AI agent to interpret responses
  return aiScreeningInterpret(responses);
}

export async function saveScreeningSession(user_id: string, session_id: string, riskScore: number, recommendation: string) {
  const supabase = createClient();
  await supabase.from("screening_sessions").update({ risk_score: riskScore, recommendation, status: "completed" }).eq("id", session_id);
}
