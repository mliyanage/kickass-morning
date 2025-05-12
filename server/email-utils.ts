import { MailService } from '@sendgrid/mail';

// Initialize SendGrid with API key
const mailService = new MailService();

// This will be initialized in the init function
let isInitialized = false;

/**
 * Initialize the SendGrid mail service
 */
export function initSendGrid() {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not found. Email functionality will not work.");
    return false;
  }

  try {
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    isInitialized = true;
    console.log("SendGrid initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize SendGrid:", error);
    return false;
  }
}

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send an email using SendGrid
 * 
 * @param params Email parameters (to, subject, text, html)
 * @returns Promise resolving to true if email was sent successfully, false otherwise
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!isInitialized) {
    console.warn("SendGrid not initialized. Cannot send email.");
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: "notifications@kickassmorning.com", // Use your verified sender
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    console.log(`Email sent to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Send an OTP code via email
 * 
 * @param email Recipient email address
 * @param otp OTP code to send
 * @param isSignup Whether this is for signup (true) or login (false)
 * @returns Promise resolving to true if email was sent successfully, false otherwise
 */
export async function sendOtpEmail(email: string, otp: string, isSignup: boolean): Promise<boolean> {
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
    html
  });
}