import Mailjet from "node-mailjet";

// Initialize Mailjet client
let mailjetClient: Mailjet | null = null;
let isInitialized = false;

/**
 * Initialize the Mailjet mail service
 */
export function initMailjet() {
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
    console.warn(
      "MAILJET_API_KEY or MAILJET_SECRET_KEY not found. Email functionality will not work.",
    );
    return false;
  }

  try {
    mailjetClient = new Mailjet({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_SECRET_KEY,
    });
    isInitialized = true;
    console.log("Mailjet initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Mailjet:", error);
    return false;
  }
}

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  fromEmail?: string;
  fromName?: string;
}

/**
 * Send an email using Mailjet
 *
 * @param params Email parameters (to, subject, text, html)
 * @returns Promise resolving to true if email was sent successfully, false otherwise
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!isInitialized || !mailjetClient) {
    console.warn("Mailjet not initialized. Cannot send email.");
    return false;
  }

  try {
    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: params.fromEmail || "notifications@kickassmorning.com",
            Name: params.fromName || "KickAss Morning",
          },
          To: [
            {
              Email: params.to,
            },
          ],
          Subject: params.subject,
          TextPart: params.text || "",
          HTMLPart: params.html || "",
        },
      ],
    });

    await request;
    console.log(`Email sent to ${params.to}`);
    return true;
  } catch (error) {
    console.error("Mailjet email error:", error);
    return false;
  }
}

/**
 * Send a welcome email to new users who scheduled their first call
 *
 * @param email Recipient email address
 * @param firstName User's first name
 * @returns Promise resolving to true if email was sent successfully, false otherwise
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
): Promise<boolean> {
  const subject = `Welcome, ${firstName}`;

  const text = `Hi ${firstName},

I'm really glad you joined Kickass Morning.

Waking up early has always been a challenge for me. I tried alarms, music, even putting my phone across the room. Nothing really worked — until I noticed I'd wake up instantly if someone called me for something important.

That's the feeling I wanted to recreate. So I built this little project for myself… and now you're one of the very first people to try it.

I'd love to hear how it goes for you. Just hit reply and tell me what happens after your first few mornings — even if it's messy, I want to know.

Talk soon,
Manjula`;

  return await sendEmail({
    to: email,
    subject,
    text,
    fromEmail: "manjula@kickassmorning.com",
    fromName: "Manjula Liyanage",
  });
}

/**
 * Send an OTP code via email
 *
 * @param email Recipient email address
 * @param otp OTP code to send
 * @param isSignup Whether this is for signup (true) or login (false)
 * @returns Promise resolving to true if email was sent successfully, false otherwise
 */
export async function sendOtpEmail(
  email: string,
  otp: string,
  isSignup: boolean,
): Promise<boolean> {
  const subject = isSignup
    ? "Verify your email for KickAss Morning"
    : "Your KickAss Morning login code";

  const text = isSignup
    ? `Welcome to KickAss Morning! Your verification code is: ${otp}. This code will expire in 10 minutes.`
    : `Your KickAss Morning login code is: ${otp}. This code will expire in 10 minutes.`;

  const html = isSignup
    ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #5E35B1;">Welcome to KickAss Morning!</h2>
      <p>Thanks for signing up. Please verify your email address to continue.</p>
      <p>Your verification code is:</p>
      <div style="background-color: #f4f4f4; padding: 12px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't create an account with us, you can safely ignore this email.</p>
    </div>
    `
    : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #5E35B1;">Your KickAss Morning login code</h2>
      <p>You requested to log in to your KickAss Morning account.</p>
      <p>Your verification code is:</p>
      <div style="background-color: #f4f4f4; padding: 12px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request to log in, please secure your account by changing your password immediately.</p>
    </div>
    `;

  return await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}
