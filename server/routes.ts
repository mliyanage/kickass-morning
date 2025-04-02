import express from "express";
import type { Express, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { 
  loginUserSchema, 
  insertUserSchema, 
  phoneVerificationSchema, 
  otpVerificationSchema,
  personalizationSchema,
  scheduleSchema,
  GoalType,
  StruggleType,
  CallStatus
} from "../shared/schema";
import { generateOTP, getNextCallTime } from "./utils";
import { sendSMS, makeCall } from "./twilio";
import { generateVoiceMessage } from "./openai";
import * as nodeSchedule from "node-schedule";
import session from "express-session";

// Extend express-session's SessionData interface
declare module "express-session" {
  interface SessionData {
    userId: number | null;
  }
}

// Custom Request type with session
interface Request extends express.Request {
  session: session.Session & {
    userId?: number | null;
  };
}

// Simple session-based authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized. Please log in." });
};

// Middleware to check if phone is verified
const isPhoneVerified = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "User not found." });
  }

  if (!user.phoneVerified) {
    return res.status(403).json({ message: "Phone number not verified." });
  }

  next();
};

// Middleware to check if user has completed personalization
const isPersonalized = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "User not found." });
  }

  if (!user.isPersonalized) {
    return res.status(403).json({ message: "User has not completed personalization." });
  }

  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup express-session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'wakeup-buddy-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));
  
  // Initialize session variables
  app.use((req: Request, _res: Response, next: NextFunction) => {
    // Initialize session variables if needed
    if (req.session.userId === undefined) {
      req.session.userId = null;
    }
    next();
  });

  // Development only endpoints
  // These should be disabled in production
  if (process.env.NODE_ENV !== 'production') {
    // Development helper to get the latest OTP
    app.get("/api/dev/latest-otp", async (req: Request, res: Response) => {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }
      
      try {
        // Get all OTPs for this email by checking the storage
        const emailKey = (storage as any).emailToKey(email);
        const otpCodes = (storage as any).otpCodes.get(emailKey) || [];
        
        if (otpCodes.length === 0) {
          console.log(`No OTPs found for ${email}`);
          
          // Find the latest OTP code in the server logs
          // This is a hack for development, allowing us to get the OTP from logs
          const consoleLogPattern = new RegExp(`OTP for ${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\((login|register)\\): (\\d+)`);
          let latestOtpFromLogs = null;
          
          // Return the most recently logged OTP
          res.status(200).json({ 
            otp: latestOtpFromLogs || "Check server logs manually", 
            message: "OTP not found in storage, check server logs for the actual code."
          });
          return;
        }
        
        // Sort by createdAt (newest first)
        const sortedOtps = [...otpCodes].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Get the latest OTP
        const latestOtp = sortedOtps[0];
        console.log(`Found latest OTP for ${email}: ${latestOtp.code} (${latestOtp.type})`);
        
        // Check if it's expired
        const isExpired = new Date() > new Date(latestOtp.expiresAt);
        
        res.status(200).json({ 
          otp: latestOtp.code,
          type: latestOtp.type,
          isExpired: isExpired,
          message: isExpired ? "Warning: This OTP has expired" : "Valid OTP"
        });
      } catch (error) {
        console.error("Dev OTP fetch error:", error);
        res.status(500).json({ message: "Error retrieving OTP" });
      }
    });
  }

  // Authentication Routes
  // Send OTP to email for signup/login
  app.post("/api/auth/request-email-otp", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email is required." });
      }
      
      // Check if user exists to determine OTP type
      const existingUser = await storage.getUserByEmail(email);
      const otpType = existingUser ? 'login' : 'register';

      // Generate OTP
      const otp = generateOTP();
      
      // Store OTP with type (login or register)
      await storage.createEmailOtp({
        email,
        code: otp,
        type: otpType,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
      });
      
      // In a real app, we would send the OTP via email here
      // For demo purposes, we'll just log it to console
      // Add a timestamp for easier tracking
      console.log(`[${new Date().toISOString()}] OTP for ${email} (${otpType}): ${otp}`);
      
      // Return success message depending on type
      const message = otpType === 'login' 
        ? "Login code sent to your email." 
        : "Registration code sent to your email.";
        
      res.status(200).json({ 
        message, 
        type: otpType
      });
    } catch (error) {
      console.error("Email OTP request error:", error);
      res.status(500).json({ message: "An error occurred while sending verification code." });
    }
  });

  // Verify email OTP and register new user if needed
  app.post("/api/auth/verify-email-otp", async (req: Request, res: Response) => {
    try {
      const { email, otp, name } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required." });
      }
      
      // First check if the OTP is valid, regardless of type
      const isOtpValid = await storage.verifyAnyEmailOtp(email, otp);
      
      if (!isOtpValid) {
        console.error(`Verification failed: Invalid OTP ${otp} for ${email}`);
        return res.status(401).json({ message: "Invalid or expired verification code." });
      }
      
      // OTP is valid, now check if user exists
      const existingUser = await storage.getUserByEmail(email);
      let user;
      
      if (existingUser) {
        // User exists, this is a login
        console.log(`Existing user ${existingUser.id} logged in with email ${email}`);
        user = existingUser;
      } else {
        // User doesn't exist, this is a registration
        if (!name) {
          return res.status(400).json({ message: "Name is required for registration." });
        }
        
        // Create new user
        user = await storage.createUser({
          email,
          name
        });
        console.log(`New user ${user.id} registered with email ${email}`);
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Return success
      res.status(existingUser ? 200 : 201).json({
        message: existingUser ? "Login successful." : "Registration successful.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneVerified: user.phoneVerified,
          isPersonalized: user.isPersonalized
        }
      });
    } catch (error) {
      console.error("Email OTP verification error:", error);
      res.status(500).json({ message: "An error occurred during verification." });
    }
  });

  // Login with email OTP
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, otp, rememberMe } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and verification code are required." });
      }
      
      // Step 1: Check if the user exists
      const existingUser = await storage.getUserByEmail(email);
      if (!existingUser) {
        return res.status(401).json({ message: "No account found with this email. Please sign up instead." });
      }
      
      // Step 2: Verify the OTP is valid for this email (regardless of type)
      // This is a simpler approach that just checks if any valid OTP exists for this email
      const isOtpValid = await storage.verifyAnyEmailOtp(email, otp);
      
      if (!isOtpValid) {
        console.error(`Login failed: Invalid OTP ${otp} for ${email}`);
        return res.status(401).json({ message: "Invalid or expired verification code." });
      }
      
      // Set session
      req.session.userId = existingUser.id;
      
      // Set session duration based on rememberMe
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }
      
      console.log(`User ${existingUser.id} logged in successfully`);
      
      // Return success
      res.status(200).json({
        message: "Login successful.",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          phoneVerified: existingUser.phoneVerified,
          isPersonalized: existingUser.isPersonalized
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "An error occurred during login." });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout." });
      }
      res.status(200).json({ message: "Logout successful." });
    });
  });

  app.get("/api/auth/check", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found." });
      }
      
      res.status(200).json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneVerified: user.phoneVerified,
          isPersonalized: user.isPersonalized
        }
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "An error occurred while checking authentication." });
    }
  });

  // Phone Verification Routes
  app.post("/api/auth/send-otp", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = phoneVerificationSchema.parse(req.body);
      
      // Generate OTP
      const otp = generateOTP();
      
      // Store OTP
      await storage.createOtpCode({
        userId: req.session.userId!,
        phone: validatedData.phone,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
      });
      
      // Send OTP via SMS
      try {
        await sendSMS(validatedData.phone, `Your KickAss Morning verification code is: ${otp}`);
      } catch (smsError) {
        console.error("SMS sending error:", smsError);
        return res.status(500).json({ message: "Failed to send verification SMS." });
      }
      
      res.status(200).json({ message: "OTP sent successfully." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data.", errors: error.errors });
      }
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "An error occurred while sending OTP." });
    }
  });

  app.post("/api/auth/verify-otp", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = otpVerificationSchema.parse(req.body);
      
      // Verify OTP
      const isValid = await storage.verifyOtpCode(req.session.userId!, validatedData.phone, validatedData.otp);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
      }
      
      // Update user's phone number and verification status
      await storage.updateUserPhone(req.session.userId!, validatedData.phone, true);
      
      res.status(200).json({ message: "Phone number verified successfully." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data.", errors: error.errors });
      }
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "An error occurred while verifying OTP." });
    }
  });

  // Personalization Routes
  app.post("/api/user/personalization", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = personalizationSchema.parse(req.body);
      
      // Save personalization data
      await storage.savePersonalization(req.session.userId!, {
        goal: validatedData.goal,
        otherGoal: validatedData.otherGoal,
        goalDescription: validatedData.goalDescription,
        struggle: validatedData.struggle,
        otherStruggle: validatedData.otherStruggle,
        voice: validatedData.voice,
        customVoice: validatedData.customVoice
      });
      
      // Update user's personalization status
      await storage.updateUserPersonalizationStatus(req.session.userId!, true);
      
      res.status(200).json({ message: "Personalization data saved successfully." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data.", errors: error.errors });
      }
      console.error("Save personalization error:", error);
      res.status(500).json({ message: "An error occurred while saving personalization data." });
    }
  });

  app.get("/api/user/personalization", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const personalization = await storage.getPersonalization(req.session.userId!);
      
      if (!personalization) {
        return res.status(404).json({ message: "Personalization data not found." });
      }
      
      res.status(200).json(personalization);
    } catch (error) {
      console.error("Get personalization error:", error);
      res.status(500).json({ message: "An error occurred while fetching personalization data." });
    }
  });

  // Schedule Routes
  app.post("/api/schedule", isAuthenticated, isPersonalized, async (req: Request, res: Response) => {
    try {
      const validatedData = scheduleSchema.parse(req.body);
      
      // Check if user has verified phone number
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(400).json({ message: "User not found." });
      }
      
      // Check if phone is verified when trying to schedule a call
      if (!user.phoneVerified || !user.phone) {
        return res.status(403).json({ 
          message: "Phone verification required", 
          phoneVerificationRequired: true 
        });
      }
      
      // Get user's personalization data
      const personalization = await storage.getPersonalization(req.session.userId!);
      if (!personalization) {
        return res.status(400).json({ message: "Please complete personalization first." });
      }
      
      // Create schedule
      const schedule = await storage.createSchedule({
        userId: req.session.userId!,
        wakeupTime: validatedData.wakeupTime,
        timezone: validatedData.timezone,
        weekdays: validatedData.weekdays.join(','),
        isRecurring: validatedData.isRecurring,
        date: validatedData.date,
        callRetry: validatedData.callRetry,
        advanceNotice: validatedData.advanceNotice,
        goalType: personalization.goal,
        struggleType: personalization.struggle,
        voiceId: personalization.voice,
        isActive: true
      });
      
      // Schedule the call
      const nextCallTime = getNextCallTime(
        validatedData.wakeupTime,
        validatedData.timezone,
        validatedData.weekdays,
        validatedData.isRecurring,
        validatedData.date
      );
      
      if (nextCallTime) {
        // Schedule the job using node-schedule library
        const job = nodeSchedule.scheduleJob(nextCallTime, async function() {
          try {
            const user = await storage.getUser(req.session.userId!);
            const scheduleData = await storage.getSchedule(schedule.id);
            
            if (user && user.phone && scheduleData && scheduleData.isActive) {
              // Generate message for the call
              const message = await generateVoiceMessage(
                scheduleData.goalType as GoalType,
                scheduleData.struggleType as StruggleType,
                user.name || "there"
              );
              
              // Make the call
              const call = await makeCall(user.phone, message, scheduleData.voiceId);
              
              // Log the call in history
              await storage.createCallHistory({
                scheduleId: schedule.id,
                userId: req.session.userId!,
                callTime: new Date(),
                voice: scheduleData.voiceId,
                status: call.status as CallStatus,
                duration: call.duration,
                recordingUrl: call.recordingUrl
              });
            }
          } catch (error) {
            console.error("Scheduled call error:", error);
          }
        });
      }
      
      res.status(201).json({
        message: "Schedule created successfully.",
        schedule: {
          id: schedule.id,
          nextCallTime: nextCallTime?.toISOString()
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data.", errors: error.errors });
      }
      console.error("Create schedule error:", error);
      res.status(500).json({ message: "An error occurred while creating schedule." });
    }
  });

  app.get("/api/schedule", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schedules = await storage.getUserSchedules(req.session.userId!);
      
      // Transform the data to match the expected format
      const formattedSchedules = schedules.map(schedule => ({
        id: schedule.id,
        userId: schedule.userId,
        wakeupTime: schedule.wakeupTime,
        timezone: schedule.timezone,
        weekdays: schedule.weekdays.split(','),
        isRecurring: schedule.isRecurring,
        date: schedule.date,
        callRetry: schedule.callRetry,
        advanceNotice: schedule.advanceNotice,
        goalType: schedule.goalType,
        struggleType: schedule.struggleType,
        voiceId: schedule.voiceId,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt
      }));
      
      res.status(200).json(formattedSchedules);
    } catch (error) {
      console.error("Get schedules error:", error);
      res.status(500).json({ message: "An error occurred while fetching schedules." });
    }
  });

  app.post("/api/schedule/:id/skip-tomorrow", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const scheduleId = parseInt(req.params.id, 10);
      
      // Check if schedule exists and belongs to user
      const schedule = await storage.getSchedule(scheduleId);
      if (!schedule || schedule.userId !== req.session.userId) {
        return res.status(404).json({ message: "Schedule not found." });
      }
      
      // Mark schedule as inactive for tomorrow only (in a real app, we would implement more complex logic here)
      await storage.updateScheduleStatus(scheduleId, false);
      
      // Schedule to reactivate after 24 hours
      const reactivateTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      // Use node-schedule directly
      const reactivationJob = nodeSchedule.scheduleJob(reactivateTime, async function() {
        await storage.updateScheduleStatus(scheduleId, true);
      });
      
      res.status(200).json({ message: "Tomorrow's call has been skipped." });
    } catch (error) {
      console.error("Skip tomorrow error:", error);
      res.status(500).json({ message: "An error occurred while processing your request." });
    }
  });

  // Call-related Routes
  app.post("/api/call/sample", isAuthenticated, isPersonalized, async (req: Request, res: Response) => {
    try {
      // Check if user has verified phone number
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(400).json({ message: "User not found." });
      }
      
      // Check if phone is verified when trying to make a call
      if (!user.phoneVerified || !user.phone) {
        return res.status(403).json({ 
          message: "Phone verification required", 
          phoneVerificationRequired: true 
        });
      }
      
      // Get personalization data
      const personalization = await storage.getPersonalization(req.session.userId!);
      if (!personalization) {
        return res.status(400).json({ message: "Personalization data not found." });
      }
      
      // Generate message for the sample call
      const message = await generateVoiceMessage(
        personalization.goal as GoalType,
        personalization.struggle as StruggleType,
        user.name || "there"
      );
      
      // Make the sample call
      const call = await makeCall(user.phone, message, personalization.voice);
      
      // Log the sample call in history
      await storage.createCallHistory({
        scheduleId: null,
        userId: req.session.userId!,
        callTime: new Date(),
        voice: personalization.voice,
        status: call.status as CallStatus,
        duration: call.duration,
        recordingUrl: call.recordingUrl
      });
      
      res.status(200).json({ message: "Sample call initiated successfully." });
    } catch (error) {
      console.error("Sample call error:", error);
      res.status(500).json({ message: "An error occurred while making the sample call." });
    }
  });

  app.get("/api/call/history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const callHistory = await storage.getUserCallHistory(req.session.userId!);
      res.status(200).json(callHistory);
    } catch (error) {
      console.error("Get call history error:", error);
      res.status(500).json({ message: "An error occurred while fetching call history." });
    }
  });

  app.get("/api/call/:id/recording", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const callId = parseInt(req.params.id, 10);
      
      // Get call details
      const call = await storage.getCallHistory(callId);
      if (!call || call.userId !== req.session.userId) {
        return res.status(404).json({ message: "Call recording not found." });
      }
      
      // Check if recording exists
      if (!call.recordingUrl) {
        return res.status(404).json({ message: "No recording available for this call." });
      }
      
      // Return recording URL
      res.status(200).json({ recordingUrl: call.recordingUrl });
    } catch (error) {
      console.error("Get call recording error:", error);
      res.status(500).json({ message: "An error occurred while fetching the recording." });
    }
  });

  // Voice preview
  app.post("/api/voice/preview", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { voiceId } = req.body;
      if (!voiceId) {
        return res.status(400).json({ message: "Voice ID is required." });
      }
      
      // In a real application, we would generate a short preview audio
      // For now, we'll just simulate success
      res.status(200).json({ message: "Voice preview generated successfully." });
    } catch (error) {
      console.error("Voice preview error:", error);
      res.status(500).json({ message: "An error occurred while generating voice preview." });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
