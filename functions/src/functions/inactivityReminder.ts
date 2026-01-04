import { app, InvocationContext, Timer } from "@azure/functions";
import { query } from "../config/db";

export async function inactivityReminder(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log('Inactivity Reminder timer triggered:', new Date().toISOString());

    try {
        // 1. Identify users inactive for > 7 days AND haven't been emailed about it in last 7 days
        // Assuming we rely on communication_logs to check for recent INACTIVITY emails
        const inactiveThreshold = '7 days';
        const cooldownThreshold = '7 days';

        const sql = `
            SELECT u.id, u.first_name, u.email, u.last_login_at
            FROM users u
            WHERE u.last_login_at < NOW() - INTERVAL '${inactiveThreshold}'
            AND NOT EXISTS (
                SELECT 1 FROM communication_logs cl
                WHERE cl.user_id = u.id 
                AND cl.type = 'INACTIVITY'
                AND cl.created_at > NOW() - INTERVAL '${cooldownThreshold}'
            )
            LIMIT 50
        `;

        const usersRes = await query(sql);
        const atRiskUsers = usersRes.rows;

        context.log(`Found ${atRiskUsers.length} users for inactivity reminder.`);

        for (const user of atRiskUsers) {
            try {
                // 2. Select appropriate message based on inactivity duration
                // (Logic can be expanded for 14/30 day tiers)
                const subject = "We miss you at CAPS360! 👋";
                const message = `Hi ${user.first_name}, it's been a week since we saw you. Come back and continue your learning streak!`;

                // 3. Send Email (Mock)
                context.log(`[MOCK EMAIL] Sending Inactivity Reminder to ${user.email} (Last login: ${user.last_login_at})`);

                // 4. Log
                await query(
                    `INSERT INTO communication_logs (user_id, type, status, metadata) VALUES ($1, $2, 'SENT', $3)`,
                    [user.id, 'INACTIVITY', JSON.stringify({ lastLogin: user.last_login_at })]
                );

            } catch (userError) {
                context.log(`Error processing inactivity reminder for user ${user.id}:`, userError);
            }
        }

    } catch (error) {
        context.log('Critical error in inactivity reminder function:', error);
    }
}

app.timer('inactivityReminder', {
    schedule: '0 0 0 * * *', // Daily at midnight
    handler: inactivityReminder
});
