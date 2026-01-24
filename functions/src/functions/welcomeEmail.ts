import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { query } from "../config/db";
import { EmailClient } from "@azure/communication-email";

// Initialize Email Client (ACS)
const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
const emailClient = connectionString ? new EmailClient(connectionString) : null;

export async function welcomeEmail(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const body: any = await request.json();
        const { userId, email, firstName } = body;

        if (!userId || !email) {
            return { status: 400, body: "Please pass userId and email in the request body" };
        }

        // 1. Idempotency Check: Check if we already sent a welcome email
        const checkLog = await query(
            `SELECT id FROM communication_logs WHERE user_id = $1 AND type = 'WELCOME' LIMIT 1`,
            [userId]
        );

        if (checkLog.rows.length > 0) {
            context.log(`Welcome email already sent to ${userId}. Skipping.`);
            return { status: 200, body: "Welcome email already sent." };
        }

        let status = 'SENT';
        let errorMessage = null;

        // 2. Send Email using Azure Communication Services
        if (emailClient) {
            try {
                context.log(`Sending Welcome Email to: ${email} (${firstName})`);
                
                const emailMessage = {
                    senderAddress: "DoNotReply@9af99e8f-e3fe-4ed3-8e83-dbcfe0f14bce.azurecomm.net",
                    content: {
                        subject: "Welcome to CAPS360! 🚀",
                        html: `
                            <html>
                                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                        <h1 style="color: #2563eb;">Welcome to CAPS360, ${firstName}! 🎓</h1>
                                        <p>We're thrilled to have you on board. Your learning journey starts here!</p>
                                        
                                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                            <h2 style="color: #1f2937; margin-top: 0;">What's next?</h2>
                                            <ul style="padding-left: 20px;">
                                                <li>Complete your profile and select your subjects</li>
                                                <li>Explore interactive lessons and quizzes</li>
                                                <li>Chat with our AI tutor for instant help</li>
                                                <li>Track your progress on your dashboard</li>
                                            </ul>
                                        </div>
                                        
                                        <p>
                                            <a href="https://mango-sky-09623131e.5.azurestaticapps.net/dashboard" 
                                               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                                Go to Dashboard
                                            </a>
                                        </p>
                                        
                                        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                                            Need help? Reply to this email or visit our support center.
                                        </p>
                                        
                                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                                        
                                        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                                            © 2026 CAPS360. All rights reserved.<br/>
                                            This email was sent to ${email}
                                        </p>
                                    </div>
                                </body>
                            </html>
                        `
                    },
                    recipients: {
                        to: [{ address: email }],
                    },
                };

                const poller = await emailClient.beginSend(emailMessage);
                const result = await poller.pollUntilDone();
                
                context.log(`Email sent successfully. Status: ${result.status}`);
            } catch (emailError: any) {
                context.log(`Error sending email: ${emailError.message}`);
                status = 'FAILED';
                errorMessage = emailError.message;
            }
        } else {
            context.log(`Email client not configured. Skipping actual send.`);
            status = 'SENT'; // Mark as sent for testing purposes
        }

        // 3. Log Communication
        await query(
            `INSERT INTO communication_logs (user_id, type, status, metadata) VALUES ($1, $2, $3, $4)`,
            [userId, 'WELCOME', status, JSON.stringify({ 
                email, 
                sentAt: new Date(), 
                error: errorMessage 
            })]
        );

        return { status: 200, body: `Welcome email ${status.toLowerCase()} to ${email}` };

    } catch (error: any) {
        context.log('Error processing welcome email:', error);
        return { status: 500, body: `Internal Server Error: ${error.message}` };
    }
};

app.http('welcomeEmail', {
    methods: ['POST'],
    authLevel: 'function',
    handler: welcomeEmail
});
