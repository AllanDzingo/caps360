import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../config/db";
import { randomBytes, createHash } from "crypto";

export async function forgotPassword(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Forgot Password request for "${request.url}"`);

    try {
        const body: any = await request.json();
        const { email } = body;

        if (!email) {
            return { status: 400, body: "Email is required" };
        }

        // 1. Verify User Exists
        const userRes = await query(`SELECT id, first_name FROM users WHERE email = $1`, [email]);
        
        // Security: Always return "If email exists, we sent a link" to prevent enumeration
        if (userRes.rows.length === 0) {
            context.log(`Password reset requested for non-existent email: ${email}`);
            return { status: 200, body: "If your email is registered, you will receive a reset link shortly." };
        }

        const user = userRes.rows[0];

        // 2. Generate Secure Token
        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        // 3. Store Linked Token (Invalidate old unused ones logic can be added here)
        await query(
            `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
            [user.id, tokenHash, expiresAt]
        );

        // 4. Send Email (Mocked)
        const resetLink = `https://caps360.app/reset-password?token=${token}&uid=${user.id}`;
        context.log(`Sending Password Reset to ${email}. Link: ${resetLink}`);
        
        // TODO: Call ACS Email Client here

        // 5. Log
        await query(
            `INSERT INTO communication_logs (user_id, type, status, metadata) VALUES ($1, $2, 'SENT', $3)`,
            [user.id, 'RESET', JSON.stringify({ email })]
        );

        return { status: 200, body: "If your email is registered, you will receive a reset link shortly." };

    } catch (error) {
        context.log('Error processing forgot password:', error);
        return { status: 500, body: "Internal Server Error" };
    }
};

app.http('forgotPassword', {
    methods: ['POST'],
    authLevel: 'function',
    handler: forgotPassword
});
