/**
 * Environment detection and configuration utilities
 *
 * This module provides utilities for detecting the current environment
 * (development, test, production) and retrieving environment-specific
 * configuration values.
 */

export type Environment = "development" | "test" | "production";

/**
 * URLs for different environments
 */
export const ENVIRONMENT_URLS = {
  development:
    "https://6b00a244-0c0a-4270-8cd6-579245215ee2-00-32783he2wcj2l.janeway.replit.dev",
  test: "https://kickass-morning-test.replit.app",
  production: "https://app.kickassmorning.com",
};

/**
 * Detect the current environment based on various environment variables and conditions
 *
 * The detection logic uses the following in order of precedence:
 * 1. Explicit APP_ENV environment variable (if set)
 * 2. NODE_ENV environment variable (if set)
 * 3. Hostname-based detection or other environment indicators
 * 4. Default to 'development' if nothing else matches
 *
 * @returns The detected environment: 'development', 'test', or 'production'
 */
export function detectEnvironment(): Environment {
  // Priority 1: Explicit APP_ENV setting
  if (process.env.APP_ENV) {
    const appEnv = process.env.APP_ENV.toLowerCase();
    if (["development", "test", "production"].includes(appEnv)) {
      return appEnv as Environment;
    }
  }

  // Priority 2: NODE_ENV setting
  if (process.env.NODE_ENV) {
    const nodeEnv = process.env.NODE_ENV.toLowerCase();
    if (nodeEnv === "production") return "production";
    if (nodeEnv === "test") return "test";
    if (nodeEnv === "development") return "development";
  }

  // Priority 3: Detect based on replit-specific environmental clues

  // Check for specific hostname patterns in REPLIT_DEPLOYMENT_ID, which exists in deployed Repls
  if (process.env.REPLIT_DEPLOYMENT_ID) {
    // If the app was deployed, we'll assume it's production unless specific indicators say otherwise
    // You could refine this logic to detect test vs. production environments

    // Example: If the URL contains "test", consider it a test environment
    const hostname = process.env.REPL_SLUG || "";
    if (hostname.includes("test")) {
      return "test";
    }

    // Otherwise, it's a production deployment
    return "production";
  }

  // Default: fallback to development
  return "development";
}

/**
 * Get the base URL for the current environment
 *
 * @returns The base URL appropriate for the current environment
 */
export function getBaseUrl(): string {
  // First check if there's an explicit BASE_URL set
  //if (process.env.BASE_URL) {
  //  return process.env.BASE_URL;
  //}

  // Otherwise determine based on environment
  const env = detectEnvironment();
  return ENVIRONMENT_URLS[env];
}

/**
 * Check if the application is running in a specific environment
 *
 * @param env The environment to check for
 * @returns True if the app is running in the specified environment
 */
export function isEnvironment(env: Environment): boolean {
  return detectEnvironment() === env;
}

/**
 * Check if application is running in development mode
 */
export function isDevelopment(): boolean {
  return isEnvironment("development");
}

/**
 * Check if application is running in test mode
 */
export function isTest(): boolean {
  return isEnvironment("test");
}

/**
 * Check if application is running in production mode
 */
export function isProduction(): boolean {
  return isEnvironment("production");
}

/**
 * Get configuration value for current environment
 *
 * @param devValue Value to use in development environment
 * @param testValue Value to use in test environment
 * @param prodValue Value to use in production environment
 * @returns The appropriate value for the current environment
 */
export function getEnvConfig<T>(devValue: T, testValue: T, prodValue: T): T {
  const env = detectEnvironment();

  switch (env) {
    case "development":
      return devValue;
    case "test":
      return testValue;
    case "production":
      return prodValue;
  }
}

// Print the detected environment when this module is loaded
console.log(`Application running in ${detectEnvironment()} environment`);
