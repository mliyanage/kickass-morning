import express from "express";
import type { Express, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import {
  loginUserSchema,
  insertUserSchema,
  phoneVerificationSchema,
  otpVerificationSchema,
  personalizationSchema,
  scheduleSchema,
  GoalType,
  StruggleType,
  CallStatus,
} from "../shared/schema";
import { generateOTP, getNextCallTime } from "./utils";
import { sendSMS, makeCall } from "./twilio";
import { generateVoiceMessage, generateSpeechAudio } from "./openai";
import { sendOtpEmail, sendWelcomeEmail } from "./email-utils";
import * as nodeSchedule from "node-schedule";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { detectEnvironment } from './env-utils';
import Stripe from "stripe";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
  res.status(401).json({
    message: "Please log in to continue.",
    requiresAuth: true,
  });
};

// Middleware to check if phone is verified
const isPhoneVerified = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session.userId) {
    return res.status(401).json({
      message: "Please log in to continue.",
      requiresAuth: true,
    });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({
      message: "Your session has expired. Please log in again.",
      requiresAuth: true,
    });
  }

  if (!user.phoneVerified) {
    return res.status(403).json({
      message: "Please verify your phone number to continue",
      phoneVerificationRequired: true,
    });
  }

  next();
};

// Middleware to check if user has completed personalization
const isPersonalized = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session.userId) {
    return res.status(401).json({
      message: "Please log in to continue.",
      requiresAuth: true,
    });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({
      message: "Your session has expired. Please log in again.",
      requiresAuth: true,
    });
  }

  if (!user.isPersonalized) {
    return res.status(403).json({
      message: "Please complete the personalization form first.",
      personalizationRequired: true,
    });
  }

  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup PostgreSQL session store for production
  const PostgreSqlStore = connectPgSimple(session);
  
  // Determine if we should use PostgreSQL session store (test and production)
  const env = detectEnvironment();
  // Use PostgreSQL sessions for all environments for consistency
  const usePostgreSQLSessions = true;
  
  console.log(`[${new Date().toISOString()}] Session store: PostgreSQL (Environment: ${env})`);
  
  // Setup express-session middleware with appropriate store
  app.use(
    session({
      store: usePostgreSQLSessions ? new PostgreSqlStore({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true
      }) : undefined, // PostgreSQL sessions used for all environments
      secret: process.env.SESSION_SECRET || "wakeup-buddy-secret",
      resave: false,
      saveUninitialized: false, // Changed to false for better security
      cookie: { 
        secure: false, // Set to true when using HTTPS in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true // Prevent XSS attacks
      },
    }),
  );

  // Initialize session variables
  app.use((req: Request, _res: Response, next: NextFunction) => {
    // Initialize session variables if needed
    if (req.session.userId === undefined) {
      req.session.userId = null;
    }
    next();
  });

  // Production-ready routes below

  // Enhanced health check endpoint for deployment monitoring
  app.get("/api/health", (req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    res.json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      memory: {
        rss: Math.round(memUsage.rss/1024/1024),
        heapUsed: Math.round(memUsage.heapUsed/1024/1024),
        heapTotal: Math.round(memUsage.heapTotal/1024/1024)
      },
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Authentication Routes
  // Send OTP to email for signup/login
  app.post(
    "/api/auth/request-email-otp",
    async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        if (!email || typeof email !== "string" || !email.includes("@")) {
          return res.status(400).json({ message: "Valid email is required." });
        }

        // Check if user exists to determine OTP type
        const existingUser = await storage.getUserByEmail(email);
        const otpType = existingUser ? "login" : "register";

        // Generate OTP
        const otp = generateOTP();

        // Store OTP with type (login or register)
        await storage.createEmailOtp({
          email,
          code: otp,
          type: otpType,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        });

        // Send the OTP via email using SendGrid
        const isSignup = otpType === "register";
        const emailSent = await sendOtpEmail(email, otp, isSignup);

        // Log for backup/debugging, but with masked OTP in production
        const maskedOtp =
          process.env.NODE_ENV === "production" ? "******" : otp;
        console.log(
          `[${new Date().toISOString()}] OTP for ${email} (${otpType}): ${maskedOtp} - Email sent: ${emailSent ? "success" : "failed"}`,
        );

        // Return success message depending on type
        const message =
          otpType === "login"
            ? "Login code sent to your email."
            : "Registration code sent to your email.";

        res.status(200).json({
          message,
          type: otpType,
        });
      } catch (error) {
        console.error("Email OTP request error:", error);
        res.status(500).json({
          message: "An error occurred while sending verification code.",
        });
      }
    },
  );

  // Verify email OTP and register new user if needed
  app.post(
    "/api/auth/verify-email-otp",
    async (req: Request, res: Response) => {
      try {
        const { email, otp, name } = req.body;

        if (!email || !otp) {
          return res.status(400).json({
            message: "Email and verification code are required.",
          });
        }

        // First check if the OTP is valid, regardless of type
        const isOtpValid = await storage.verifyAnyEmailOtp(email, otp);

        if (!isOtpValid) {
          console.error(`Verification failed: Invalid OTP ${otp} for ${email}`);
          return res.status(401).json({
            message: "Invalid or expired verification code.",
          });
        }

        // OTP is valid, now check if user exists
        const existingUser = await storage.getUserByEmail(email);
        let user;

        if (existingUser) {
          // User exists, this is a login
          console.log(
            `Existing user ${existingUser.id} logged in with email ${email}`,
          );
          user = existingUser;
        } else {
          // User doesn't exist, this is a registration
          if (!name) {
            return res.status(400).json({
              message: "Name is required for registration.",
            });
          }

          // Create new user
          user = await storage.createUser({
            email,
            name,
          });
          console.log(`New user ${user.id} registered with email ${email}`);
        }

        // Set session
        req.session.userId = user.id;

        // Return success
        res.status(200).json({
          message: existingUser
            ? "Login successful."
            : "Registration successful.",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            phoneVerified: user.phoneVerified,
            isPersonalized: user.isPersonalized,
          },
        });
      } catch (error) {
        console.error("Email OTP verification error:", error);
        res.status(500).json({
          message: "Something went wrong. Please try again later.",
        });
      }
    },
  );

  // Login with email OTP
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, otp, rememberMe } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          message: "Email and verification code are required.",
        });
      }

      // Step 1: Check if the user exists
      const existingUser = await storage.getUserByEmail(email);
      if (!existingUser) {
        return res.status(401).json({
          message: "No account found with this email. Please sign up instead.",
        });
      }

      // Step 2: Verify the OTP is valid for this email (regardless of type)
      // This is a simpler approach that just checks if any valid OTP exists for this email
      const isOtpValid = await storage.verifyAnyEmailOtp(email, otp);

      if (!isOtpValid) {
        console.error(`Login failed: Invalid OTP ${otp} for ${email}`);
        return res.status(401).json({
          message: "Invalid or expired verification code.",
        });
      }

      // Set session
      req.session.userId = existingUser.id;

      // Set session duration based on rememberMe
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      console.log(`User ${existingUser.id} logged in successfully`);
      console.log(`Session ID: ${req.sessionID}, User ID in session: ${req.session.userId}`);

      // Return success
      res.status(200).json({
        message: "Login successful.",
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          phone: existingUser.phone,
          phoneVerified: existingUser.phoneVerified,
          isPersonalized: existingUser.isPersonalized,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        message: "Something went wrong. Please try again later.",
      });
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
    console.log(`Auth check - Session ID: ${req.sessionID}, User ID: ${req.session.userId}`);
    if (!req.session.userId) {
      return res.status(200).json({
        authenticated: false,
        message: "Please log in to continue.",
      });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        // Session exists but user doesn't - clear the session
        req.session.destroy((err: any) => {
          if (err) console.error("Failed to destroy invalid session:", err);
        });

        return res.status(200).json({
          authenticated: false,
          message: "Your session has expired. Please log in again.",
        });
      }

      res.status(200).json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          phoneVerified: user.phoneVerified,
          isPersonalized: user.isPersonalized,
        },
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while checking authentication." });
    }
  });

  // Phone Verification Routes
  app.post(
    "/api/auth/send-otp",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const validatedData = phoneVerificationSchema.parse(req.body);

        // Log the phone number for debugging
        console.log(
          `Sending OTP to international number: ${validatedData.phone}`,
        );

        // Ensure phone number is in E.164 format (should already be validated by schema)
        const phoneNumber = validatedData.phone;
        if (!phoneNumber.startsWith("+")) {
          return res.status(400).json({
            message:
              "Invalid phone number format. Must start with '+' followed by country code.",
          });
        }

        // Generate OTP
        const otp = generateOTP();

        // Store OTP
        await storage.createOtpCode({
          userId: req.session.userId!,
          phone: phoneNumber,
          code: otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        });

        // Send OTP via SMS
        try {
          await sendSMS(
            phoneNumber,
            `Your KickAss Morning verification code is: ${otp}`,
          );

          // Log success for debugging
          console.log(`Successfully sent OTP to ${phoneNumber}`);
        } catch (error) {
          console.error("SMS sending error:", error);
          return res.status(500).json({
            message:
              "Failed to send verification SMS. Please check your phone number and try again.",
          });
        }

        res.status(200).json({ message: "OTP sent successfully." });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors
            .map((err) => `${err.path}: ${err.message}`)
            .join(", ");
          return res.status(400).json({
            message: "Invalid phone number format.",
            details: errorMessages,
          });
        }
        console.error("Send OTP error:", error);
        res
          .status(500)
          .json({ message: "An error occurred while sending OTP." });
      }
    },
  );

  app.post(
    "/api/auth/verify-otp",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const validatedData = otpVerificationSchema.parse(req.body);

        // Ensure phone number is in E.164 format
        const phoneNumber = validatedData.phone;
        if (!phoneNumber.startsWith("+")) {
          return res.status(400).json({
            message:
              "Invalid phone number format. Must start with '+' followed by country code.",
          });
        }

        // Add more detailed debug logging
        console.log(
          `[OTP Debug] Verifying OTP for user ${req.session.userId}, phone ${phoneNumber}, code ${validatedData.otp}`,
        );

        // Verify OTP
        const isValid = await storage.verifyOtpCode(
          req.session.userId!,
          phoneNumber,
          validatedData.otp,
        );

        if (!isValid) {
          // Get the user to check if the phone number matches what's stored
          const user = await storage.getUser(req.session.userId!);
          if (user && user.phone && user.phone !== phoneNumber) {
            console.log(
              `[OTP Debug] Phone number mismatch. User has ${user.phone} but verification attempted with ${phoneNumber}`,
            );
            return res
              .status(400)
              .json({ message: "Phone number doesn't match our records." });
          }

          // Check if there are any active OTPs for this user and phone
          if (await storage.hasActiveOtps(req.session.userId!, phoneNumber)) {
            console.log(
              `[OTP Debug] User has active OTPs but entered incorrect code`,
            );
            return res.status(400).json({
              message:
                "Incorrect verification code. Please check and try again.",
            });
          }

          console.log(`[OTP Debug] OTP likely expired for ${phoneNumber}`);
          return res.status(400).json({
            message:
              "Verification code has expired. Please request a new code.",
          });
        }

        // Update user's phone number and verification status
        await storage.updateUserPhone(req.session.userId!, phoneNumber, true);

        console.log(
          `[OTP Debug] Phone verification successful for user ${req.session.userId}, phone ${phoneNumber}`,
        );
        res
          .status(200)
          .json({ message: "Phone number verified successfully." });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors
            .map((err) => `${err.path}: ${err.message}`)
            .join(", ");
          return res.status(400).json({
            message: "Invalid input format.",
            details: errorMessages,
          });
        }
        console.error("Verify OTP error:", error);
        res
          .status(500)
          .json({ message: "An error occurred while verifying OTP." });
      }
    },
  );

  // Firebase Phone Verification
  app.post(
    "/api/auth/verify-firebase-phone",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { firebaseToken, phone } = req.body;
        
        if (!firebaseToken || !phone) {
          return res.status(400).json({
            message: "Firebase token and phone number are required.",
          });
        }

        // Validate phone number format
        if (!phone.startsWith("+")) {
          return res.status(400).json({
            message: "Invalid phone number format. Must start with '+' followed by country code.",
          });
        }

        // TODO: Verify Firebase token with Firebase Admin SDK
        // For now, we'll trust the frontend verification
        // In production, you should verify the token server-side
        
        console.log(`[Firebase] Phone verification successful for user ${req.session.userId}, phone ${phone}`);
        
        // Update user's phone number and verification status
        await storage.updateUserPhone(req.session.userId!, phone, true);

        res.status(200).json({ 
          message: "Phone number verified successfully with Firebase.",
          method: "firebase"
        });
      } catch (error) {
        console.error("Firebase verify phone error:", error);
        res.status(500).json({ 
          message: "An error occurred while verifying phone with Firebase." 
        });
      }
    },
  );

  // Personalization Routes
  app.post(
    "/api/user/personalization",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const validatedData = personalizationSchema.parse(req.body);

        // Save personalization data - using new array-based structure
        await storage.savePersonalization(req.session.userId!, {
          goals: validatedData.goals,
          otherGoal: validatedData.otherGoal,
          goalDescription: validatedData.goalDescription,
          struggles: validatedData.struggles,
          otherStruggle: validatedData.otherStruggle,
          voice: validatedData.voice,
          customVoice: validatedData.customVoice,
        });

        // Update user's personalization status
        await storage.updateUserPersonalizationStatus(
          req.session.userId!,
          true,
        );

        res
          .status(200)
          .json({ message: "Personalization data saved successfully." });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid input data.", errors: error.errors });
        }
        console.error("Save personalization error:", error);
        res.status(500).json({
          message: "An error occurred while saving personalization data.",
        });
      }
    },
  );

  app.get(
    "/api/user/personalization",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const personalization = await storage.getPersonalization(
          req.session.userId!,
        );

        if (!personalization) {
          return res
            .status(404)
            .json({ message: "Personalization data not found." });
        }

        res.status(200).json(personalization);
      } catch (error) {
        console.error("Get personalization error:", error);
        res.status(500).json({
          message: "An error occurred while fetching personalization data.",
        });
      }
    },
  );

  // Get user's trial status and credits
  app.get(
    "/api/user/trial-status",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const trialStatus = await storage.getUserTrialStatus(req.session.userId!);
        
        // Prevent caching to ensure fresh credit data
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.status(200).json(trialStatus);
      } catch (error) {
        console.error("Get trial status error:", error);
        res.status(500).json({
          message: "An error occurred while fetching trial status.",
        });
      }
    },
  );

  // Schedule Routes
  app.post(
    "/api/schedule",
    isAuthenticated,
    isPhoneVerified,
    isPersonalized,
    async (req: Request, res: Response) => {
      // Check if we're updating an existing schedule
      const scheduleId = req.query.id
        ? parseInt(req.query.id as string, 10)
        : null;
      if (scheduleId) {
        try {
          const validatedData = scheduleSchema.parse(req.body);
          console.log("Updating schedule with ID:", scheduleId);
          console.log(
            "Weekdays from request:",
            validatedData.weekdays,
            "Type:",
            typeof validatedData.weekdays,
          );

          // Check if schedule exists and belongs to user
          const existingSchedule = await storage.getSchedule(scheduleId);
          console.log("Existing schedule found:", existingSchedule);
          if (!existingSchedule) {
            return res.status(404).json({ message: "Schedule not found." });
          }

          if (existingSchedule.userId !== req.session.userId) {
            return res.status(403).json({
              message: "You don't have permission to update this schedule.",
            });
          }

          // Get user's personalization data
          const personalization = await storage.getPersonalization(
            req.session.userId!,
          );
          if (!personalization) {
            return res
              .status(400)
              .json({ message: "Please complete personalization first." });
          }

          // Process weekdays
          let formattedWeekdays = "";
          if (Array.isArray(validatedData.weekdays)) {
            formattedWeekdays = validatedData.weekdays.join(",");
            console.log("Weekdays formatted from array:", formattedWeekdays);
          } else if (typeof validatedData.weekdays === "string") {
            formattedWeekdays = validatedData.weekdays;
            console.log("Weekdays already a string:", formattedWeekdays);
          }

          // Keep original goal, struggle and voice if they exist
          const updateData = {
            wakeupTime: validatedData.wakeupTime,
            timezone: validatedData.timezone,
            weekdays: formattedWeekdays,
            isRecurring: validatedData.isRecurring,
            date: validatedData.date,
            callRetry: validatedData.callRetry,
            advanceNotice: validatedData.advanceNotice,
            // Keep existing values if present, otherwise use from personalization
            goalType: undefined,
            struggleType: undefined,
            voiceId: undefined,
          };

          console.log("Updating schedule with data:", updateData);

          // Update the schedule
          const updatedSchedule = await storage.updateSchedule(
            scheduleId,
            updateData,
          );

          res.status(200).json({
            message: "Schedule updated successfully.",
            schedule: updatedSchedule,
          });
          return;
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res
              .status(400)
              .json({ message: "Invalid input data.", errors: error.errors });
          }
          console.error("Update schedule error:", error);
          res
            .status(500)
            .json({ message: "An error occurred while updating schedule." });
          return;
        }
      }

      // This is a new schedule creation
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
            phoneVerificationRequired: true,
          });
        }

        // Get user's personalization data
        const personalization = await storage.getPersonalization(
          req.session.userId!,
        );
        if (!personalization) {
          const errorResponse = { 
            message: "Please complete personalization first.",
            personalizationRequired: true
          };
          console.log('[Schedule Creation] Personalization required, sending 403 response:', errorResponse);
          return res.status(403).json(errorResponse);
        }

        // Check schedule limits and duplicates
        const existingSchedules = await storage.getUserSchedules(req.session.userId!);
        
        // Limit: Maximum 3 schedules per user
        if (existingSchedules.length >= 3) {
          return res.status(400).json({
            message: "Maximum 3 schedules allowed per user. Please delete an existing schedule first.",
            maxSchedulesReached: true
          });
        }

        // Check for duplicate schedules (same time, timezone, and weekdays for recurring schedules)
        const formattedWeekdays = Array.isArray(validatedData.weekdays)
          ? validatedData.weekdays.join(",")
          : validatedData.weekdays;
        
        const duplicateSchedule = existingSchedules.find(existing => {
          if (validatedData.isRecurring && existing.isRecurring) {
            // For recurring schedules, check time, timezone, and weekdays
            return existing.wakeupTime === validatedData.wakeupTime &&
                   existing.timezone === validatedData.timezone &&
                   existing.weekdays === formattedWeekdays &&
                   existing.isActive;
          } else if (!validatedData.isRecurring && !existing.isRecurring && validatedData.date) {
            // For one-time schedules, check date, time, and timezone
            // Note: one-time schedules are not implemented in current schema
            return existing.wakeupTime === validatedData.wakeupTime &&
                   existing.timezone === validatedData.timezone &&
                   existing.isActive;
          }
          return false;
        });

        if (duplicateSchedule) {
          return res.status(400).json({
            message: "A schedule with the same time and settings already exists.",
            duplicateSchedule: true
          });
        }

        // Create schedule
        const schedule = await storage.createSchedule({
          userId: req.session.userId!,
          wakeupTime: validatedData.wakeupTime,
          timezone: validatedData.timezone,
          weekdays: Array.isArray(validatedData.weekdays)
            ? validatedData.weekdays.join(",")
            : validatedData.weekdays,
          isRecurring: validatedData.isRecurring,
          date: validatedData.date,
          callRetry: validatedData.callRetry,
          advanceNotice: validatedData.advanceNotice,
          goalType: personalization.goals[0],
          struggleType: personalization.struggles[0],
          voiceId: personalization.voice,
          isActive: true,
        });

        // Note: Calls are now handled by the centralized scheduler (scheduler.ts)
        // No need to create individual node-schedule jobs here as the main scheduler
        // will detect and process this schedule based on database state

        // Check if this is the user's first schedule and send welcome email
        const userSchedules = await storage.getUserSchedules(user.id);
        if (userSchedules.length === 1 && !user.welcomeEmailSent) {
          // This is their first schedule, send welcome email
          const firstName = user.name ? user.name.split(' ')[0] : 'there';
          const emailSent = await sendWelcomeEmail(user.email, firstName);
          
          if (emailSent) {
            // Mark welcome email as sent
            await storage.updateWelcomeEmailSent(user.id);
            console.log(`Welcome email sent to ${user.email} (${firstName})`);
          } else {
            console.warn(`Failed to send welcome email to ${user.email}`);
          }
        }

        res.status(201).json({
          message: "Schedule created successfully.",
          schedule: {
            id: schedule.id,
          },
          isFirstSchedule: schedule.isFirstSchedule,
          hasUsedFreeTrial: schedule.hasUsedFreeTrial,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid input data.", errors: error.errors });
        }
        console.error("Create schedule error:", error);
        res
          .status(500)
          .json({ message: "An error occurred while creating schedule." });
      }
    },
  );

  app.get(
    "/api/schedule",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        console.log("Fetching schedules for user:", req.session.userId);
        const schedules = await storage.getUserSchedules(req.session.userId!);
        console.log("Found schedules in database:", schedules);

        // Transform the data to match the expected format
        const formattedSchedules = schedules.map((schedule) => {
          const weekdays =
            typeof schedule.weekdays === "string"
              ? schedule.weekdays.split(",")
              : [];
          console.log(
            `Formatting schedule ${schedule.id} - weekdays from db: ${schedule.weekdays} (${typeof schedule.weekdays})`,
          );
          console.log(`Formatted to array: ${weekdays} (${typeof weekdays})`);

          return {
            id: schedule.id,
            userId: schedule.userId,
            wakeupTime: schedule.wakeupTime,
            timezone: schedule.timezone,
            weekdays: weekdays,
            isRecurring: schedule.isRecurring,
            date: undefined,
            callRetry: undefined,
            advanceNotice: undefined,
            goalType: undefined,
            struggleType: undefined,
            voiceId: undefined,
            isActive: schedule.isActive,
            createdAt: schedule.createdAt,
          };
        });

        console.log(
          "Returning formatted schedules to client:",
          formattedSchedules,
        );
        res.status(200).json(formattedSchedules);
      } catch (error) {
        console.error("Get schedules error:", error);
        res
          .status(500)
          .json({ message: "An error occurred while fetching schedules." });
      }
    },
  );

  app.post(
    "/api/schedule/:id/skip-tomorrow",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const scheduleId = parseInt(req.params.id, 10);

        // Check if schedule exists and belongs to user
        const schedule = await storage.getSchedule(scheduleId);
        if (!schedule || schedule.userId !== req.session.userId) {
          return res.status(404).json({ message: "Schedule not found." });
        }

        // Mark schedule as inactive for tomorrow only (in a real app, we would implement more complex logic here)
        await storage.updateScheduleStatus(scheduleId, false);

        // Note: Schedule will need to be manually reactivated by user
        // Automatic reactivation has been removed to prevent phantom calls from old node-schedule jobs

        res.status(200).json({ message: "Tomorrow's call has been skipped." });
      } catch (error) {
        console.error("Skip tomorrow error:", error);
        res.status(500).json({
          message: "An error occurred while processing your request.",
        });
      }
    },
  );

  app.post(
    "/api/schedule/:id/toggle",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const scheduleId = parseInt(req.params.id, 10);

        // Check if schedule exists and belongs to user
        const schedule = await storage.getSchedule(scheduleId);
        if (!schedule || schedule.userId !== req.session.userId) {
          return res.status(404).json({ message: "Schedule not found." });
        }

        // Toggle the schedule status
        const newStatus = !schedule.isActive;
        await storage.updateScheduleStatus(scheduleId, newStatus);

        const action = newStatus ? "resumed" : "paused";
        const message = newStatus 
          ? "Schedule has been resumed and is now active." 
          : "Schedule has been paused and is now inactive.";

        res.status(200).json({ 
          message,
          isActive: newStatus,
          action
        });
      } catch (error) {
        console.error("Toggle schedule error:", error);
        res.status(500).json({
          message: "An error occurred while processing your request.",
        });
      }
    },
  );

  // Call-related Routes
  app.post(
    "/api/call/sample",
    isAuthenticated,
    isPersonalized,
    async (req: Request, res: Response) => {
      try {
        console.log("Sample call initiated for user:", req.session.userId);

        // Check if user has verified phone number
        const user = await storage.getUser(req.session.userId!);
        if (!user) {
          return res.status(400).json({ message: "User not found." });
        }

        // Check if phone is verified when trying to make a call
        if (!user.phoneVerified || !user.phone) {
          return res.status(403).json({
            message: "Phone verification required",
            phoneVerificationRequired: true,
          });
        }

        console.log("Making sample call to verified phone:", user.phone);

        // Get personalization data
        const personalization = await storage.getPersonalization(
          req.session.userId!,
        );
        if (!personalization) {
          return res
            .status(400)
            .json({ message: "Personalization data not found." });
        }

        console.log("Personalization data found:", {
          goals: personalization.goals,
          struggles: personalization.struggles,
          voice: personalization.voice,
        });

        // Generate message for the sample call
        const message = await generateVoiceMessage(
          personalization.goals as GoalType[],
          personalization.struggles as StruggleType[],
          user.name || "there",
          personalization.otherGoal,
          personalization.otherStruggle,
        );

        console.log("Generated voice message, length:", message.length);

        // Check if user has sufficient credits before making sample call
        const trialStatus = await storage.getUserTrialStatus(req.session.userId!);
        const userCallHistory = await storage.getUserCallHistory(req.session.userId!);
        const isFirstCall = userCallHistory.length === 0;

        // Allow call if this is first call ever OR user has credits
        if (!isFirstCall && trialStatus.callCredits <= 0) {
          console.log(`User ${req.session.userId!} has no credits (${trialStatus.callCredits}) - cannot make sample call`);
          return res.status(400).json({ 
            message: "Insufficient credits to make call",
            credits: trialStatus.callCredits 
          });
        }

        console.log(`Sample call for user ${req.session.userId!}: isFirstCall=${isFirstCall}, credits=${trialStatus.callCredits}`);

        // Make the sample call using Twilio
        const call = await makeCall(user.phone, message, personalization.voice);

        // Deduct credit after successful sample call (only for users who have made calls before)
        if (!isFirstCall && call.status && !['failed', 'busy', 'no-answer'].includes(call.status)) {
          try {
            const deductResult = await storage.deductUserCredit(req.session.userId!);
            if (deductResult.success) {
              console.log(`Successfully deducted 1 credit from user ${req.session.userId!} for sample call. New balance: ${deductResult.newBalance}`);
            } else {
              console.error(`Failed to deduct credit from user ${req.session.userId!} for sample call. Current balance: ${deductResult.newBalance}`);
            }
          } catch (error) {
            console.error(`Error deducting credit from user ${req.session.userId!}:`, error);
          }
        }

        // Log the sample call in history
        await storage.createCallHistory({
          scheduleId: null,
          userId: req.session.userId!,
          callTime: new Date(), // For sample calls, use actual time
          timezone: null, // Sample calls don't have a specific timezone
          voice: personalization.voice,
          callSid: call.callSid, // Add the Twilio Call SID
          status: call.status as CallStatus,
          duration: call.duration,
          recordingUrl: call.recordingUrl,
        });

        res
          .status(200)
          .json({ message: "Sample call initiated successfully." });
      } catch (error) {
        console.error("Sample call error:", error);
        res
          .status(500)
          .json({ message: "An error occurred while making the sample call." });
      }
    },
  );

  app.get(
    "/api/call/history",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const callHistory = await storage.getUserCallHistory(
          req.session.userId!,
        );
        res.status(200).json(callHistory);
      } catch (error) {
        console.error("Get call history error:", error);
        res
          .status(500)
          .json({ message: "An error occurred while fetching call history." });
      }
    },
  );

  app.get(
    "/api/call/:id/recording",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const callId = parseInt(req.params.id, 10);

        // Get call details
        const call = await storage.getCallHistory(callId);
        if (!call || call.userId !== req.session.userId) {
          return res.status(404).json({ message: "Call recording not found." });
        }

        // Check if recording exists
        if (!call.recordingUrl) {
          return res
            .status(404)
            .json({ message: "No recording available for this call." });
        }

        // Return recording URL
        res.status(200).json({ recordingUrl: call.recordingUrl });
      } catch (error) {
        console.error("Get call recording error:", error);
        res
          .status(500)
          .json({ message: "An error occurred while fetching the recording." });
      }
    },
  );

  // Voice preview
  app.post(
    "/api/voice/preview",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { voiceId } = req.body;
        if (!voiceId) {
          return res.status(400).json({ message: "Voice ID is required." });
        }

        // Use path.resolve for ES modules instead of __dirname
        const audioFilePath = path.resolve(
          "audio-cache",
          "voice_preview",
          `${voiceId}.mp3`,
        );

        // Check if the file exists
        if (!fs.existsSync(audioFilePath)) {
          return res.status(404).json({ message: "Voice preview not found." });
        }

        // Return the URL to the preview audio file
        res.status(200).json({
          message: "Voice preview found",
          audioUrl: `/audio-cache/voice_preview/${voiceId}.mp3`,
        });
        console.log(`Serving voice preview: ${voiceId}.mp3`);
      } catch (error) {
        console.error("Voice preview error:", error);
        res.status(500).json({
          message: "An error occurred while generating voice preview.",
        });
      }
    },
  );

  // Test route for ElevenLabs integration
  app.post("/api/elevenlabs/test", async (req: Request, res: Response) => {
    try {
      const { text, voice } = req.body;
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Import directly here to avoid circular dependencies
      const { textToSpeech } = await import("./elevenlabs");

      // Use the provided voice or default to 'jocko'
      const voiceId = voice || "jocko";

      // Generate audio with ElevenLabs
      const result = await textToSpeech(text, voiceId);

      // Return the URL to the generated audio file
      res.json({
        message: "Audio generated successfully",
        audioUrl: result.url,
        voice: voiceId,
      });
    } catch (error: any) {
      console.error("Error testing ElevenLabs:", error);
      res.status(500).json({
        message: "Failed to generate audio with ElevenLabs",
        error: error.message,
      });
    }
  });

  // Twilio webhook for call status updates
  app.post(
    "/api/webhooks/twilio/status",
    async (req: Request, res: Response) => {
      try {
        console.log("Received Twilio webhook:", req.body);

        // Extract data from the webhook
        const { CallSid, CallStatus } = req.body;

        if (!CallSid) {
          return res.status(400).json({ message: "Missing CallSid parameter" });
        }

        // Map Twilio call status string to our CallStatus enum
        console.log(
          `Mapping Twilio call status: "${CallStatus}" for call SID: ${CallSid}`,
        );

        // Use a string-based approach for clearer mapping
        let statusString: string;

        switch (CallStatus) {
          case "completed":
            statusString = "completed";
            break;
          case "no-answer":
            statusString = "no-answer";
            break;
          case "busy":
            statusString = "busy";
            break;
          case "failed":
            statusString = "failed";
            break;
          case "canceled":
            statusString = "canceled";
            break;
          case "ringing":
            statusString = "ringing";
            break;
          case "in-progress":
            statusString = "in-progress";
            break;
          case "queued":
            statusString = "queued";
            break;
          case "initiated":
            statusString = "initiated";
            break;
          default:
            statusString = "failed"; // Default to failed for unknown statuses
            console.log(
              `Unrecognized Twilio status: "${CallStatus}", mapped to ${statusString}`,
            );
        }

        // Convert string to enum value
        const status = statusString as CallStatus;

        console.log(`Mapped status: ${status}`); // Debug log to confirm mapping

        // Update the call status in the database
        await storage.updateCallStatus(CallSid, status);

        // Respond to Twilio
        res.sendStatus(200);
      } catch (error) {
        console.error("Error handling Twilio webhook:", error);
        // Always return 200 to Twilio even if we have an error
        res.sendStatus(200);
      }
    },
  );

  // Stripe payment routes
  app.post("/api/stripe/create-checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { bundleType } = req.body;
      
      if (!bundleType || !["20_calls", "50_calls"].includes(bundleType)) {
        return res.status(400).json({ message: "Invalid bundle type" });
      }

      // Bundle configurations
      const bundles = {
        "20_calls": { price: 999, credits: 20, name: "20 Wake-up Calls" }, // $9.99 in cents
        "50_calls": { price: 1999, credits: 50, name: "50 Wake-up Calls" }  // $19.99 in cents
      };

      const bundle = bundles[bundleType as keyof typeof bundles];

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: bundle.name,
              description: `${bundle.credits} AI-powered wake-up calls to start your mornings strong!`,
            },
            unit_amount: bundle.price,
          },
          quantity: 1,
        }],
        success_url: `${req.headers.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/dashboard`,
        metadata: {
          userId: req.session.userId!.toString(),
          bundleType,
          credits: bundle.credits.toString(),
        },
      });

      res.json({ 
        checkoutUrl: session.url,
        sessionId: session.id 
      });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ 
        message: "Error creating checkout session",
        error: error.message 
      });
    }
  });

  // Stripe webhook endpoint is now registered in index.ts before JSON parsing middleware

  // Get payment session details (for success page)
  app.get("/api/stripe/session/:sessionId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      // Only return session details for the authenticated user
      if (session.metadata?.userId !== req.session.userId?.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        bundleType: session.metadata?.bundleType,
        credits: session.metadata?.credits,
        amountTotal: session.amount_total,
      });
    } catch (error: any) {
      console.error("Error retrieving session:", error);
      res.status(500).json({ message: "Error retrieving payment session" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
