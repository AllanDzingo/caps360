import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../config/db";
// import { EmailClient } from "@azure/communication-email";

// Initialize Email Client (ACS) or Mock if not configured
// const emailClient = new EmailClient(process.env.COMMUNICATION_SERVICES_CONNECTION_STRING || "endpoint=https://mock.com;accesskey=mock");

export async function welcomeEmail(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const body: any = await request.json();
        const { userId, email, firstName } = body;

        if (!userId || !email) {
            return { status: 400, body: "Please pass userId and email in the request body" };
        }

        // 1. Idempotency Check: Check if we already sent a welcome email today
        // (In reality, welcome email should be sent only once ever, but logging logic helps)
        const checkLog = await query(
            `SELECT id FROM communication_logs WHERE user_id = $1 AND type = 'WELCOME' LIMIT 1`,
            [userId]
        );

        if (checkLog.rows.length > 0) {
            context.log(`Welcome email already sent to ${userId}. Skipping.`);
            return { status: 200, body: "Welcome email already sent." };
        }

        // 2. Mock Sending Email (Replace with real ACS call below when keys active)
        context.log(`Sending Welcome Email to: ${email} (${firstName})`);
        
        /* 
        const emailMessage = {
            senderAddress: "DoNotReply@your-domain.com",
            content: {
                subject: "Welcome to CAPS360! 🚀",
                html: `<h1>Welcome, ${firstName}!</h1><p>We are thrilled to have you on board.</p>`
            },
            recipients: {
                to: [{ address: email }],
            },
        };
        const poller = await emailClient.beginSend(emailMessage);
        const result = await poller.pollUntilDone();
        */

        const status = 'SENT'; // or 'FAILED'

        // 3. Log Communication
        await query(
            `INSERT INTO communication_logs (user_id, type, status, metadata) VALUES ($1, $2, $3, $4)`,
            [userId, 'WELCOME', status, JSON.stringify({ email, sentAt: new Date() })]
        );

        return { status: 200, body: `Welcome email sent to ${email}` };

    } catch (error) {
        context.log('Error processing welcome email:', error);
        return { status: 500, body: "Internal Server Error" };
    }
};

app.http('welcomeEmail', {
    methods: ['POST'],
    authLevel: 'function',
    handler: welcomeEmail
});
