import Mailjet from 'node-mailjet';

// Initialize Mailjet client
let mailjetClient: Mailjet | null = null;
let isInitialized = false;

/**
 * Initialize the Mailjet mail service
 */
export function initMailjet() {
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
    console.warn("MAILJET_API_KEY or MAILJET_SECRET_KEY not found. Email functionality will not work.");
    return false;
  }

  try {
    mailjetClient = new Mailjet({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_SECRET_KEY
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
  html: string;
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
    const request = mailjetClient
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: params.fromEmail || "notifications@kickassmorning.com",
              Name: params.fromName || "KickAss Morning"
            },
            To: [
              {
                Email: params.to
              }
            ],
            Subject: params.subject,
            TextPart: params.text || '',
            HTMLPart: params.html || '',
          }
        ]
      });

    await request;
    console.log(`Email sent to ${params.to}`);
    return true;
  } catch (error) {
    console.error('Mailjet email error:', error);
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
export async function sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
  const subject = "you're in — thanks for joining me";
  
  const text = `Hey ${firstName},

Thanks so much for signing up for Kickass Morning — this means a lot to me.

Waking up early has been something I've struggled with pretty much my whole life. Alarms never worked. Even when I got enough sleep, I'd just shut them off and roll back over.

But whenever I had someone call me — like a friend needing a ride to the airport, or an early appointment — I'd wake up immediately, no hesitation.

That's what gave me the idea:
What if I could recreate that feeling of someone counting on me — using AI?

So I built this little tool, first just for myself. And now you're one of the very first people to try it out.

It's still early days, and I'd really love your feedback.
Please use it for a few days and let me know how it goes — good or bad, I want to hear it.
You can just reply to this email or write to me at gangoda@kickassmorning.com.

Here are a few quick tips to get the most out of it:

☀️ Save the number you get the call from
Make it something motivating like "Drill Sergeant" or "Coach You Got This"

🔕 Don't keep your phone on silent
And try to actually answer when it rings — that's the whole magic

⏱️ Don't go too hard too fast
Set your first call just 30 minutes earlier than your usual wake-up. After a week, you can push it earlier.

I'm also working on a few things behind the scenes:

Letting you connect landline or second numbers

Adding weekly "success report cards"

More voices and even motivational texts

Wake-up calls for other goals, not just mornings

If this helps you even a little, would you mind sharing it on your social media?
That would seriously help me keep building and improving it.

You can link to kickassmorning.com — and I'll be super grateful 🙏

Thanks again. You've officially got someone to call you out of bed.
Let's crush the morning together.

– Gangoda
Founder, Kickass Morning`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
      <p>Hey ${firstName},</p>
      
      <p>Thanks so much for signing up for Kickass Morning — this means a lot to me.</p>
      
      <p>Waking up early has been something I've struggled with pretty much my whole life. Alarms never worked. Even when I got enough sleep, I'd just shut them off and roll back over.</p>
      
      <p>But whenever I had someone call me — like a friend needing a ride to the airport, or an early appointment — I'd wake up immediately, no hesitation.</p>
      
      <p><strong>That's what gave me the idea:</strong><br>
      What if I could recreate that feeling of someone counting on me — using AI?</p>
      
      <p>So I built this little tool, first just for myself. And now you're one of the very first people to try it out.</p>
      
      <p>It's still early days, and I'd really love your feedback.<br>
      Please use it for a few days and let me know how it goes — good or bad, I want to hear it.<br>
      You can just reply to this email or write to me at <a href="mailto:gangoda@kickassmorning.com">gangoda@kickassmorning.com</a>.</p>
      
      <h3 style="color: #5E35B1;">Here are a few quick tips to get the most out of it:</h3>
      
      <p><strong>☀️ Save the number you get the call from</strong><br>
      Make it something motivating like "Drill Sergeant" or "Coach You Got This"</p>
      
      <p><strong>🔕 Don't keep your phone on silent</strong><br>
      And try to actually answer when it rings — that's the whole magic</p>
      
      <p><strong>⏱️ Don't go too hard too fast</strong><br>
      Set your first call just 30 minutes earlier than your usual wake-up. After a week, you can push it earlier.</p>
      
      <h3 style="color: #5E35B1;">I'm also working on a few things behind the scenes:</h3>
      
      <ul>
        <li>Letting you connect landline or second numbers</li>
        <li>Adding weekly "success report cards"</li>
        <li>More voices and even motivational texts</li>
        <li>Wake-up calls for other goals, not just mornings</li>
      </ul>
      
      <p>If this helps you even a little, would you mind sharing it on your social media?<br>
      That would seriously help me keep building and improving it.</p>
      
      <p>You can link to <a href="https://kickassmorning.com">kickassmorning.com</a> — and I'll be super grateful 🙏</p>
      
      <p>Thanks again. You've officially got someone to call you out of bed.<br>
      Let's crush the morning together.</p>
      
      <p style="margin-top: 30px;">– Gangoda<br>
      <em>Founder, Kickass Morning</em></p>
    </div>
  `;
  
  return await sendEmail({
    to: email,
    subject,
    text,
    html,
    fromEmail: "gangoda@kickassmorning.com",
    fromName: "Gangoda from KickAss Morning"
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