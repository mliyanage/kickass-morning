import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from 'url';
import { startCallScheduler, startCleanupScheduler, stopAllSchedulers } from "./scheduler";
import { initMailjet } from "./email-utils";
import { detectEnvironment } from "./env-utils";

// Enhanced process monitoring and graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Starting graceful shutdown...');
  stopAllSchedulers();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal. Starting graceful shutdown...');
  stopAllSchedulers();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Memory monitoring for deployment health
setInterval(() => {
  const memUsage = process.memoryUsage();
  const mbUsed = Math.round(memUsage.rss/1024/1024);
  const heapUsed = Math.round(memUsage.heapUsed/1024/1024);
  const heapTotal = Math.round(memUsage.heapTotal/1024/1024);
  console.log(`[${new Date().toISOString()}] Memory Usage: RSS=${mbUsed}MB, Heap=${heapUsed}MB/${heapTotal}MB`);
}, 300000); // Every 5 minutes

// Create dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect environment early to log it
const currentEnv = detectEnvironment();
console.log(`Starting application in ${currentEnv} environment`);

const app = express();

// Register Stripe webhook BEFORE JSON parsing middleware to preserve raw body
app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    console.error("No Stripe signature found");
    return res.status(400).send('No signature');
  }

  try {
    // Import Stripe here to avoid circular dependencies
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    // Import storage here to avoid circular dependencies
    const { storage } = await import('./storage');
    
    // In production, you should set STRIPE_WEBHOOK_SECRET
    const event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET || 'we_test' // For test mode
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const { userId, bundleType, credits } = session.metadata!;
      
      console.log(`Payment completed for user ${userId}: ${bundleType} (${credits} credits)`);
      
      // Add credits to user's account
      if (userId && credits) {
        const user = await storage.getUser(parseInt(userId));
        if (user) {
          await storage.updateUserCredits(parseInt(userId), parseInt(credits));
          console.log(`Added ${credits} credits to user ${userId}`);
        }
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Now add JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve audio files from the audio-cache directory
app.use('/audio-cache', express.static(path.join(__dirname, '..', 'audio-cache')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  // Create a safer response.json override that avoids the "body stream already read" error
  const originalJson = res.json;
  res.json = function(body) {
    // Reset json to original to avoid infinite recursion
    res.json = originalJson;
    return originalJson.call(this, body);
  };
  
  // Use a safer approach to log responses that won't interfere with body streams
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Simple logging without response body inspection
      const env = detectEnvironment();
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Initialize Mailjet for email notifications
  initMailjet();
  
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (detectEnvironment() === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the schedulers
    try {
      log("Starting scheduled tasks...");
      
      // Start the call scheduler to check for pending calls every minute
      startCallScheduler();
      
      // Start the cleanup scheduler to remove old audio files
      startCleanupScheduler();
      
      log("Scheduled tasks started successfully");
    } catch (error) {
      console.error("Failed to start scheduled tasks:", error);
    }
  });
})();
