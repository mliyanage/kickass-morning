#!/bin/bash

# Test Environment Deployment Script
# This script deploys KickAss Morning to the test environment

echo "🧪 Deploying to Test Environment..."

# Set test environment variables
export NODE_ENV=test
export DEPLOYMENT_ENV=test

# Ensure test database is set
if [ -z "$TEST_DATABASE_URL" ]; then
    echo "❌ ERROR: TEST_DATABASE_URL must be set for test deployment"
    echo "Please set your test database URL in Replit secrets:"
    echo "TEST_DATABASE_URL=postgresql://user:pass@host:port/test_db"
    exit 1
fi

echo "✅ Test database configured: ${TEST_DATABASE_URL##*@}"

# Run database migrations for test environment
echo "📦 Running database migrations for test environment..."
npm run db:push

# Build the application
echo "🔨 Building application..."
npm run build

# Start the test server
echo "🚀 Starting test server..."
npm run start

echo "✅ Test deployment complete!"
echo "🌐 Test URL: https://your-test-app.replit.app"