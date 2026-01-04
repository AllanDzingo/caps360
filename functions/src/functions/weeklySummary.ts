import { app, InvocationContext, Timer } from "@azure/functions";
import { query } from "../config/db";
import { AzureOpenAI } from "openai";

// Configure Azure OpenAI
// Ensure these are set in the Function App settings
const openai = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini"
});

export async function weeklySummary(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log('Weekly Summary timer triggered:', new Date().toISOString());

    try {
        // 1. Fetch active users
        const usersRes = await query(`
            SELECT id, first_name, email 
            FROM users 
            WHERE last_login_at > NOW() - INTERVAL '7 days'
            LIMIT 50 
        `);

        const activeUsers = usersRes.rows;
        context.log(`Found ${activeUsers.length} active users for weekly summary.`);

        for (const user of activeUsers) {
            try {
                // 2. Aggregate Progress
                const progressRes = await query(`
                    SELECT COUNT(*) as lessons_completed 
                    FROM user_lesson_progress 
                    WHERE user_id = $1 
                    AND completed_at > NOW() - INTERVAL '7 days'
                `, [user.id]);

                const lessonsCount = parseInt(progressRes.rows[0].lessons_completed, 10);

                if (lessonsCount === 0) {
                    context.log(`User ${user.email} has 0 activity. Skipping AI summary.`);
                    continue;
                }

                // 3. Generate AI Summary using Azure OpenAI
                const prompt = `User ${user.first_name} completed ${lessonsCount} lessons this week. Write a 2-sentence encouraging summary asking them to keep it up.`;

                let aiSummary = "";
                try {
                    const completion = await openai.chat.completions.create({
                        messages: [{ role: "system", content: "You are a helpful educational assistant." }, { role: "user", content: prompt }],
                        model: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini",
                    });
                    aiSummary = completion.choices[0].message.content || "Great job! Keep learning.";
                } catch (aiError) {
                    context.log(`Azure OpenAI Error for user ${user.id}:`, aiError);
                    aiSummary = `Great job! You completed ${lessonsCount} lessons this week. Keep up the good work!`;
                }

                context.log(`Generated Summary for ${user.email}: "${aiSummary}"`);

                // 4. Send Email (Mock)
                context.log(`[MOCK EMAIL] Sending Weekly Digest to ${user.email}`);

                // 5. Log
                await query(
                    `INSERT INTO communication_logs (user_id, type, status, metadata) VALUES ($1, $2, 'SENT', $3)`,
                    [user.id, 'WEEKLY_SUMMARY', JSON.stringify({ lessonsCount, summary: aiSummary })]
                );

            } catch (userError) {
                context.log(`Error processing weekly summary for user ${user.id}:`, userError);
            }
        }

    } catch (error) {
        context.log('Critical error in weekly summary function:', error);
    }
}

app.timer('weeklySummary', {
    schedule: '0 0 8 * * MON', // Every Monday at 08:00
    handler: weeklySummary
});
