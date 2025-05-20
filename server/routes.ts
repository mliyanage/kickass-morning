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
import { sendOtpEmail } from "./email-utils";
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
  // Setup express-session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "wakeup-buddy-secret",
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
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

  // Schedule Routes
  app.post(
    "/api/schedule",
    isAuthenticated,
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
            goalType: existingSchedule.goalType || personalization.goals[0],
            struggleType:
              existingSchedule.struggleType || personalization.struggles[0],
            voiceId: existingSchedule.voiceId || personalization.voice,
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
          return res
            .status(400)
            .json({ message: "Please complete personalization first." });
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

        // Schedule the call
        const nextCallTime = getNextCallTime(
          validatedData.wakeupTime,
          validatedData.timezone,
          validatedData.weekdays,
          validatedData.isRecurring,
          validatedData.date,
        );

        if (nextCallTime) {
          // Schedule the job using node-schedule library
          const job = nodeSchedule.scheduleJob(nextCallTime, async function () {
            try {
              const user = await storage.getUser(req.session.userId!);
              const scheduleData = await storage.getSchedule(schedule.id);

              if (user && user.phone && scheduleData && scheduleData.isActive) {
                // Get personalization data for more detailed message generation
                const personalization = await storage.getPersonalization(
                  req.session.userId!,
                );

                // Generate message for the call with main goal and struggle from schedule
                // but using full personalization data for context
                const message = await generateVoiceMessage(
                  [scheduleData.goalType as GoalType], // Use schedule's goal as primary focus
                  [scheduleData.struggleType as StruggleType], // Use schedule's struggle as primary focus
                  user.name || "there",
                  personalization?.otherGoal,
                  personalization?.otherStruggle,
                );

                // Make the call
                const call = await makeCall(
                  user.phone,
                  message,
                  scheduleData.voiceId,
                );

                // Log the call in history
                await storage.createCallHistory({
                  scheduleId: schedule.id,
                  userId: req.session.userId!,
                  callTime: new Date(),
                  voice: scheduleData.voiceId,
                  status: call.status as CallStatus,
                  duration: call.duration,
                  recordingUrl: call.recordingUrl,
                  callSid: call.callSid, // Add the Twilio Call SID
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
            nextCallTime: nextCallTime?.toISOString(),
          },
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
            date: schedule.date,
            callRetry: schedule.callRetry,
            advanceNotice: schedule.advanceNotice,
            goalType: schedule.goalType,
            struggleType: schedule.struggleType,
            voiceId: schedule.voiceId,
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

        // Schedule to reactivate after 24 hours
        const reactivateTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        // Use node-schedule directly
        const reactivationJob = nodeSchedule.scheduleJob(
          reactivateTime,
          async function () {
            await storage.updateScheduleStatus(scheduleId, true);
          },
        );

        res.status(200).json({ message: "Tomorrow's call has been skipped." });
      } catch (error) {
        console.error("Skip tomorrow error:", error);
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

        // Make the sample call using Twilio
        const call = await makeCall(user.phone, message, personalization.voice);

        // Log the sample call in history
        await storage.createCallHistory({
          scheduleId: null,
          userId: req.session.userId!,
          callTime: new Date(),
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
        const { CallSid, CallStatus, RecordingUrl } = req.body;

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
        await storage.updateCallStatus(CallSid, status, RecordingUrl);

        // Respond to Twilio
        res.sendStatus(200);
      } catch (error) {
        console.error("Error handling Twilio webhook:", error);
        // Always return 200 to Twilio even if we have an error
        res.sendStatus(200);
      }
    },
  );

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
