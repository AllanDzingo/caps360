import { EmailClient, EmailMessage, EmailAddress } from "@azure/communication-email";
import logger from "../config/logger";

// Defensive: Read all config from env at runtime
const acsConnectionString = process.env.ACS_CONNECTION_STRING;

const emailFromAddress = process.env.EMAIL_FROM_ADDRESS;

if (!acsConnectionString) {
  logger.warn("ACS_CONNECTION_STRING is not set. Welcome emails will not be sent.");
}
if (!emailFromAddress) {
  logger.warn("EMAIL_FROM_ADDRESS is not set. Welcome emails will not be sent.");
}

export interface WelcomeEmailPayload {
  to: string;
  firstName: string;
}

/**
 * Sends a welcome email using Azure Communication Services Email.
 * Non-blocking: errors are logged, but do not throw.
 */
export async function sendWelcomeEmail({ to, firstName }: WelcomeEmailPayload): Promise<void> {
  if (!acsConnectionString || !emailFromAddress) {
    logger.warn("Missing ACS email config. Skipping welcome email.");
    return;
  }
  try {
    const client = new EmailClient(acsConnectionString);
    const message: EmailMessage = {
      senderAddress: emailFromAddress,
      content: {
        subject: "Welcome to CAPS360!",
        plainText: `Hi ${firstName},\n\nWelcome to CAPS360! We're excited to have you on board.\n\nBest regards,\nThe CAPS360 Team`,
        html: `<p>Hi ${firstName},</p><p>Welcome to <b>CAPS360</b>! We're excited to have you on board.</p><p>Best regards,<br/>The CAPS360 Team</p>`
      },
      recipients: {
        to: [ { address: to, displayName: firstName } as EmailAddress ]
      }
    };
    const poller = await client.beginSend(message);
    await poller.pollUntilDone();
    logger.info(`Welcome email sent to ${to}`);
  } catch (err) {
    // Log error safely, no secrets
    logger.error("Failed to send welcome email", { to, error: (err as Error).message });
  }
}
