import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { detectEnvironment } from './env-utils';

/**
 * Get the appropriate database URL based on the current environment
 */
function getDatabaseUrl(): string {
  const env = detectEnvironment();
  
  switch (env) {
    case 'test':
      if (!process.env.TEST_DATABASE_URL) {
        console.warn('TEST_DATABASE_URL not set, falling back to DATABASE_URL');
        return process.env.DATABASE_URL || '';
      }
      return process.env.TEST_DATABASE_URL;
      
    case 'production':
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL must be set for production environment");
      }
      return process.env.DATABASE_URL;
      
    case 'development':
    default:
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
      }
      return process.env.DATABASE_URL;
  }
}

const databaseUrl = getDatabaseUrl();
const env = detectEnvironment();

console.log(`[${env.toUpperCase()}] Connecting to database: ${databaseUrl.split('@')[1] || 'local'}`);

// Configure connection pool with better settings for AWS RDS
export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: env === 'production' ? 10 : 5, // More connections in production
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  connectionTimeoutMillis: 10000, // 10 seconds connection timeout
  ssl: env === 'production' ? { rejectUnauthorized: false } : false, // SSL for RDS
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error(`Database pool error [${env}]:`, err);
});

export const db = drizzle({ client: pool, schema });
