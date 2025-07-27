# Multi-Environment Deployment Guide

## Overview

KickAss Morning supports multiple deployment environments with dedicated databases for proper data isolation and testing workflows.

## Database Setup

### 1. Create Separate Databases

**Test Environment:**
- Create a new Replit PostgreSQL database specifically for testing
- Use environment variable: `TEST_DATABASE_URL`

**Production Environment:**
- Use your existing production PostgreSQL database
- Keep existing environment variable: `DATABASE_URL`

### 2. Environment Detection Logic

The app automatically detects environments based on:
- **Development**: `NODE_ENV !== 'production'` OR running locally
- **Test**: `NODE_ENV === 'test'` OR `DEPLOYMENT_ENV === 'test'`
- **Production**: `NODE_ENV === 'production'` AND `DEPLOYMENT_ENV === 'production'`

## Deployment Configuration

### Test Environment
```bash
# Test deployment secrets
NODE_ENV=test
DEPLOYMENT_ENV=test
TEST_DATABASE_URL=postgresql://user:pass@host:port/test_db
TWILIO_ACCOUNT_SID=AC... (test credentials)
MAILJET_API_KEY=... (test credentials)
```

### Production Environment
```bash
# Production deployment secrets
NODE_ENV=production
DEPLOYMENT_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/prod_db
TWILIO_ACCOUNT_SID=AC... (production credentials)
MAILJET_API_KEY=... (production credentials)
```

## Environment-Specific Features

### Database Connection
- **Test**: Uses `TEST_DATABASE_URL` with test data
- **Production**: Uses `DATABASE_URL` with live user data

### External Services
- **Test**: Can use Twilio test credentials and Mailjet test API
- **Production**: Uses live credentials for real calls and emails

### Session Storage
- **Test**: PostgreSQL-based sessions (test database)
- **Production**: PostgreSQL-based sessions (production database)

## Step-by-Step Deployment Process

### 1. Create Separate Databases

**For Test Environment:**
1. Create a new Replit project or fork your existing one
2. Go to Database tab in Replit
3. Create a new PostgreSQL database specifically for testing
4. Copy the database connection URL
5. Add to Replit Secrets as `TEST_DATABASE_URL`

**For Production Environment:**
1. Use your existing production database
2. Ensure `DATABASE_URL` is set in production secrets

### 2. Configure Environment Variables

**Test Deployment Secrets:**
```
NODE_ENV=test
DEPLOYMENT_ENV=test
TEST_DATABASE_URL=postgresql://user:pass@host:port/test_db
TWILIO_ACCOUNT_SID=AC... (test credentials)
TWILIO_AUTH_TOKEN=... (test token)
TWILIO_PHONE_NUMBER=+1... (test number)
MAILJET_API_KEY=... (test API key)
MAILJET_SECRET_KEY=... (test secret)
```

**Production Deployment Secrets:**
```
NODE_ENV=production
DEPLOYMENT_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/prod_db
TWILIO_ACCOUNT_SID=AC... (production credentials)
TWILIO_AUTH_TOKEN=... (production token)  
TWILIO_PHONE_NUMBER=+1... (production number)
MAILJET_API_KEY=... (production API key)
MAILJET_SECRET_KEY=... (production secret)
```

### 3. Deploy Applications

**Test Environment:**
1. Fork your main project in Replit
2. Name it "kickass-morning-test"
3. Set test environment variables in Secrets
4. Click Deploy button
5. Choose "Reserved VM" for consistent testing

**Production Environment:**
1. In your main project
2. Set production environment variables in Secrets
3. Click Deploy button
4. Choose "Autoscale" for production scaling
5. Configure custom domain if desired

### 4. Database Migration

**After deploying each environment:**
1. The app will automatically detect the environment
2. Connect to the appropriate database
3. Run `npm run db:push` to apply schema changes
4. Verify tables are created correctly

### 5. Verification Steps

**Test Environment Checklist:**
- [ ] App loads at test URL
- [ ] Database connection shows test database in logs
- [ ] User registration works with test emails
- [ ] SMS works with test phone numbers
- [ ] Scheduler runs but doesn't make real calls

**Production Environment Checklist:**
- [ ] App loads at production URL
- [ ] Database connection shows production database in logs
- [ ] Real user registration and verification works
- [ ] Live calls and SMS work correctly
- [ ] All production integrations functional

## Database Migration Strategy

### Schema Updates
```bash
# Test environment
DEPLOYMENT_ENV=test npm run db:push

# Production environment  
DEPLOYMENT_ENV=production npm run db:push
```

### Data Migration
- Test database: Can be reset/seeded with test data
- Production database: Requires careful migration planning

## Monitoring

### Environment-Specific Health Checks
- Test: `https://test-app.replit.app/api/health`
- Production: `https://prod-app.replit.app/api/health`

### Separate Logging
Each environment maintains isolated:
- Call history
- User data
- System logs
- Error tracking

## Best Practices

### Test Environment
- Use test phone numbers for Twilio
- Use test email addresses for Mailjet
- Can reset database regularly
- Safe for experimental features

### Production Environment
- Real user data and phone numbers
- Live payment processing (if applicable)
- Careful deployment procedures
- Regular backups

## Security Considerations

1. **Separate Credentials**: Never use production API keys in test
2. **Data Isolation**: Test and production data never mix
3. **Access Control**: Different team access levels per environment
4. **Backup Strategy**: Production requires automated backups