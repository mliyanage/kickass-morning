# Deployment Environments Guide

## Overview

KickAss Morning is designed for flexible deployment across multiple environments. This guide covers production deployment on AWS Elastic Beanstalk with a separate RDS PostgreSQL database.

## Architecture Decision

We use AWS Elastic Beanstalk for application hosting with a separate RDS instance for the database, rather than EB-managed RDS. This provides:
- Greater database control and flexibility
- Independent scaling of compute and database resources
- Easier database backup and maintenance
- Ability to persist data across application redeployments

## Environment Configuration

### Development Environment (Current)
- **Platform**: Replit
- **Database**: Neon PostgreSQL (serverless)
- **Sessions**: Memory-based
- **Features**: Full development setup with hot reloading

### Production Environment (AWS)
- **Platform**: AWS Elastic Beanstalk (Node.js 20)
- **Database**: AWS RDS PostgreSQL (separate instance)
- **Sessions**: PostgreSQL-backed sessions
- **Features**: Production-optimized with proper scaling

## Pre-Deployment Requirements

### 1. AWS Account Setup
- AWS account with appropriate permissions
- AWS CLI installed and configured
- EB CLI installed

### 2. Environment Variables Required
```bash
# Database
DATABASE_URL=postgresql://username:password@rds-endpoint:5432/database

# Email Service
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key

# SMS/Voice Service
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# AI Services
OPENAI_API_KEY=your_openai_api_key

# Analytics (Optional)
VITE_GA_MEASUREMENT_ID=your_google_analytics_id

# Environment
NODE_ENV=production
```

### 3. Database Migration Strategy
- Export development data if needed
- Run database schema migration on RDS
- Verify all indexes and constraints

## Step-by-Step AWS Deployment Process

### Phase 1: Database Setup (RDS)

1. **Create RDS PostgreSQL Instance**
   ```bash
   # Create DB subnet group
   aws rds create-db-subnet-group \
     --db-subnet-group-name kickass-morning-subnet-group \
     --db-subnet-group-description "Subnet group for KickAss Morning" \
     --subnet-ids subnet-12345 subnet-67890

   # Create RDS instance
   aws rds create-db-instance \
     --db-instance-identifier kickass-morning-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --engine-version 15.4 \
     --master-username kickassuser \
     --master-user-password YOUR_SECURE_PASSWORD \
     --allocated-storage 20 \
     --db-name kickassmorning \
     --vpc-security-group-ids sg-12345 \
     --db-subnet-group-name kickass-morning-subnet-group \
     --backup-retention-period 7 \
     --storage-encrypted
   ```

2. **Configure Security Group**
   - Allow inbound PostgreSQL (port 5432) from EB environment
   - Restrict access to application servers only

3. **Get Database Endpoint**
   ```bash
   aws rds describe-db-instances --db-instance-identifier kickass-morning-db
   ```

### Phase 2: Application Preparation

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Create .ebextensions Directory**
   ```bash
   mkdir .ebextensions
   ```

3. **Create EB Configuration Files**
   
   **.ebextensions/01-nodejs.config**
   ```yaml
   option_settings:
     aws:elasticbeanstalk:application:environment:
       NODE_ENV: production
     aws:elasticbeanstalk:container:nodejs:
       NodeCommand: "npm start"
       NodeVersion: 20.9.0
   ```

   **.ebextensions/02-environment.config**
   ```yaml
   option_settings:
     aws:elasticbeanstalk:application:environment:
       NODE_OPTIONS: "--max-old-space-size=1024"
   ```

4. **Update package.json Scripts**
   ```json
   {
     "scripts": {
       "start": "node server/index.js",
       "build": "npm run build:client && npm run build:server",
       "build:client": "vite build client",
       "build:server": "tsc server/index.ts --outDir build"
     }
   }
   ```

### Phase 3: Elastic Beanstalk Setup

1. **Initialize EB Application**
   ```bash
   eb init
   ```
   - Select region (e.g., us-east-1)
   - Choose Node.js platform
   - Set application name: kickass-morning

2. **Create EB Environment**
   ```bash
   eb create production
   ```
   - Choose load balancer type: Application Load Balancer
   - Enable spot fleet requests: No (for stability)

3. **Configure Environment Variables**
   ```bash
   eb setenv \
     DATABASE_URL=postgresql://kickassuser:password@your-rds-endpoint:5432/kickassmorning \
     MAILJET_API_KEY=your_key \
     MAILJET_SECRET_KEY=your_secret \
     TWILIO_ACCOUNT_SID=your_sid \
     TWILIO_AUTH_TOKEN=your_token \
     TWILIO_PHONE_NUMBER=your_number \
     OPENAI_API_KEY=your_openai_key \
     NODE_ENV=production
   ```

### Phase 4: Database Schema Setup

1. **Run Database Migration**
   ```bash
   # Connect to RDS instance
   psql postgresql://kickassuser:password@your-rds-endpoint:5432/kickassmorning

   # Or use the application's built-in migration
   npm run db:push
   ```

2. **Verify Schema**
   ```sql
   \dt  -- List all tables
   \d users  -- Describe users table
   \d schedules  -- Describe schedules table
   \d calls  -- Describe calls table
   ```

### Phase 5: Deployment

1. **Deploy Application**
   ```bash
   eb deploy
   ```

2. **Monitor Deployment**
   ```bash
   eb logs
   eb health
   eb status
   ```

3. **Test Application**
   ```bash
   eb open
   ```

## Post-Deployment Configuration

### 1. Domain Setup
- Configure custom domain through Route 53
- Set up SSL certificate via Certificate Manager
- Update CORS settings if needed

### 2. Monitoring Setup
- CloudWatch alarms for application health
- RDS monitoring for database performance
- Log aggregation setup

### 3. Backup Strategy
- RDS automated backups (already configured)
- Application code backup via git
- Environment configuration backup

## Environment Variables Security

### Sensitive Data Management
- Use AWS Systems Manager Parameter Store for secrets
- Rotate API keys regularly
- Monitor for exposed credentials

### Example Parameter Store Setup
```bash
aws ssm put-parameter \
  --name "/kickass-morning/production/database-url" \
  --value "postgresql://..." \
  --type "SecureString"
```

## Scaling Configuration

### Auto Scaling Settings
```yaml
# .ebextensions/03-scaling.config
option_settings:
  aws:autoscaling:asg:
    MinSize: 1
    MaxSize: 4
  aws:autoscaling:trigger:
    MeasureName: CPUUtilization
    Unit: Percent
    UpperThreshold: 80
    LowerThreshold: 20
```

### Database Scaling
- Monitor RDS CPU and memory usage
- Scale up instance class if needed
- Consider read replicas for high traffic

## Troubleshooting

### Common Issues
1. **Database Connection Timeouts**
   - Check security group rules
   - Verify RDS endpoint accessibility
   - Test connection from EB instance

2. **Environment Variable Issues**
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure secure string values are accessible

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Review build logs for specific errors

### Monitoring Commands
```bash
# Application logs
eb logs

# Environment health
eb health --refresh

# RDS monitoring
aws rds describe-db-instances --db-instance-identifier kickass-morning-db

# CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElasticBeanstalk \
  --metric-name EnvironmentHealth \
  --dimensions Name=EnvironmentName,Value=production
```

## Maintenance

### Regular Tasks
- Monitor application performance
- Review RDS performance insights
- Update dependencies
- Rotate API keys
- Review CloudWatch alarms

### Backup Verification
- Test RDS backup restoration
- Verify application configuration backup
- Document recovery procedures

## Cost Optimization

### EB Instance Optimization
- Use t3.micro for low traffic
- Enable spot instances for non-critical environments
- Monitor usage patterns for right-sizing

### RDS Optimization
- Use db.t3.micro for development
- Scale to db.t3.small or larger for production
- Monitor storage growth and optimize queries

---

**Last Updated**: August 3, 2025
**Environment**: Production-ready AWS deployment
**Database**: Separate RDS PostgreSQL instance
**Scaling**: Auto-scaling enabled with monitoring