#!/bin/bash

# Production Environment Deployment Script
# This script deploys KickAss Morning to the production environment

echo "🚀 Deploying to Production Environment..."

# Set production environment variables
export NODE_ENV=production
export DEPLOYMENT_ENV=production

# Ensure production database is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL must be set for production deployment"
    echo "Please set your production database URL in Replit secrets:"
    echo "DATABASE_URL=postgresql://user:pass@host:port/prod_db"
    exit 1
fi

echo "✅ Production database configured: ${DATABASE_URL##*@}"

# Run database migrations for production environment
echo "📦 Running database migrations for production environment..."
npm run db:push

# Build the application
echo "🔨 Building application..."
npm run build

# Start the production server
echo "🚀 Starting production server..."
npm run start

echo "✅ Production deployment complete!"
echo "🌐 Production URL: https://your-prod-app.replit.app"