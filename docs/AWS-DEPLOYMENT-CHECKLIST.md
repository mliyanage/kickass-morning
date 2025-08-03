# AWS Elastic Beanstalk Deployment Checklist

## Pre-Deployment Setup

### ✅ AWS Account & Tools
- [ ] AWS account with appropriate IAM permissions
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] EB CLI installed (`pip install awsebcli`)
- [ ] Verify AWS credentials: `aws sts get-caller-identity`

### ✅ Environment Variables Preparation
Collect these API keys and credentials:

**Database:**
- [ ] RDS PostgreSQL endpoint (to be created)
- [ ] Database username and password

**Email Service (Mailjet):**
- [ ] MAILJET_API_KEY
- [ ] MAILJET_SECRET_KEY

**SMS/Voice Service (Twilio):**
- [ ] TWILIO_ACCOUNT_SID
- [ ] TWILIO_AUTH_TOKEN  
- [ ] TWILIO_PHONE_NUMBER

**AI Service (OpenAI):**
- [ ] OPENAI_API_KEY

**Analytics (Optional):**
- [ ] VITE_GA_MEASUREMENT_ID

## Phase 1: RDS Database Setup

### Step 1: Create VPC Security Group
```bash
# Create security group for RDS
aws ec2 create-security-group \
  --group-name kickass-morning-rds-sg \
  --description "Security group for KickAss Morning RDS instance"

# Note the GroupId from the response
export SG_ID="sg-xxxxxxxxx"

# Allow PostgreSQL access from EB instances (will update with EB security group later)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EB_SG_ID
```

### Step 2: Create RDS Subnet Group
```bash
# Get available subnets
aws ec2 describe-subnets --query 'Subnets[*].[SubnetId,AvailabilityZone,VpcId]' --output table

# Create subnet group (use subnets from different AZs)
aws rds create-db-subnet-group \
  --db-subnet-group-name kickass-morning-subnet-group \
  --db-subnet-group-description "Subnet group for KickAss Morning DB" \
  --subnet-ids subnet-xxxxxxxx subnet-yyyyyyyy
```

### Step 3: Create RDS Instance
```bash
# Generate secure password
export DB_PASSWORD=$(openssl rand -base64 32)
echo "Database password: $DB_PASSWORD" # Save this securely!

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier kickass-morning-prod-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username kickassuser \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --db-name kickassmorning \
  --vpc-security-group-ids $SG_ID \
  --db-subnet-group-name kickass-morning-subnet-group \
  --backup-retention-period 7 \
  --storage-encrypted \
  --deletion-protection
```

### Step 4: Get Database Endpoint
```bash
# Wait for DB to be available (5-10 minutes)
aws rds wait db-instance-available --db-instance-identifier kickass-morning-prod-db

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier kickass-morning-prod-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### Step 5: Construct Database URL
```bash
export DB_ENDPOINT="your-rds-endpoint.region.rds.amazonaws.com"
export DATABASE_URL="postgresql://kickassuser:$DB_PASSWORD@$DB_ENDPOINT:5432/kickassmorning"
echo $DATABASE_URL # Save this for EB environment variables
```

## Phase 2: Elastic Beanstalk Setup

### Step 1: Initialize EB Application
```bash
# From your project root directory
eb init

# Select:
# - Region: us-east-1 (or your preferred region)
# - Application name: kickass-morning
# - Platform: Node.js 20 running on 64bit Amazon Linux 2023
# - CodeCommit: No
# - SSH: Yes (recommended for debugging)
```

### Step 2: Create EB Environment
```bash
eb create production \
  --instance-types t3.small \
  --envvars NODE_ENV=production
```

### Step 3: Update RDS Security Group with EB Security Group
```bash
# Get EB environment's security group
export EB_SG_ID=$(aws elasticbeanstalk describe-environments \
  --environment-names production \
  --query 'Environments[0].Resources.LoadBalancer.SecurityGroups[0]' \
  --output text)

# Update RDS security group to allow access from EB
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EB_SG_ID
```

### Step 4: Set Environment Variables
```bash
eb setenv \
  DATABASE_URL="$DATABASE_URL" \
  MAILJET_API_KEY="your_mailjet_api_key" \
  MAILJET_SECRET_KEY="your_mailjet_secret_key" \
  TWILIO_ACCOUNT_SID="your_twilio_sid" \
  TWILIO_AUTH_TOKEN="your_twilio_token" \
  TWILIO_PHONE_NUMBER="your_twilio_number" \
  OPENAI_API_KEY="your_openai_key" \
  NODE_ENV="production"
```

## Phase 3: Database Schema Migration

### Step 1: Test Database Connection
```bash
# Install PostgreSQL client if needed
sudo apt-get install postgresql-client

# Test connection
psql "$DATABASE_URL" -c "SELECT version();"
```

### Step 2: Run Schema Migration
```bash
# Update DATABASE_URL in your local environment for migration
export DATABASE_URL="$DATABASE_URL"

# Push schema to production database
npm run db:push
```

### Step 3: Verify Schema
```bash
psql "$DATABASE_URL" -c "\dt" # List tables
psql "$DATABASE_URL" -c "\d users" # Verify users table
psql "$DATABASE_URL" -c "\d schedules" # Verify schedules table
psql "$DATABASE_URL" -c "\d calls" # Verify calls table
```

## Phase 4: Application Deployment

### Step 1: Update Production Build Scripts
Verify these scripts exist in package.json:
```json
{
  "scripts": {
    "start": "node server/index.js",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build client",
    "build:server": "tsc --build"
  }
}
```

### Step 2: Deploy Application
```bash
# Deploy to EB
eb deploy

# Monitor deployment
eb logs --all
```

### Step 3: Verify Deployment
```bash
# Check application health
eb health

# Get application URL
eb status

# Open application in browser
eb open
```

## Phase 5: SSL Certificate Setup

### Step 1: Request SSL Certificate
```bash
# Request certificate through AWS Certificate Manager
aws acm request-certificate \
  --domain-name kickassmorning.com \
  --subject-alternative-names www.kickassmorning.com \
  --validation-method DNS

# Note the CertificateArn from response
export CERT_ARN="arn:aws:acm:region:account:certificate/certificate-id"
```

### Step 2: Update HTTPS Configuration
Edit `.ebextensions/04-https.config` and replace the certificate ARN:
```yaml
option_settings:
  aws:elbv2:listener:443:
    Protocol: HTTPS
    SSLCertificateArns: YOUR_CERTIFICATE_ARN
```

### Step 3: Deploy with HTTPS
```bash
eb deploy
```

## Phase 6: Domain Setup (Optional)

### Step 1: Get Load Balancer DNS Name
```bash
aws elasticbeanstalk describe-environments \
  --environment-names production \
  --query 'Environments[0].CNAME'
```

### Step 2: Create Route 53 Records
```bash
# Create hosted zone (if you don't have one)
aws route53 create-hosted-zone \
  --name kickassmorning.com \
  --caller-reference $(date +%s)

# Create CNAME record pointing to EB environment
# (Use Route 53 console or CLI)
```

## Phase 7: Monitoring & Alerts

### Step 1: Set Up CloudWatch Alarms
```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "KickAss-Morning-High-CPU" \
  --alarm-description "Alarm when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Database connection alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "KickAss-Morning-DB-Connections" \
  --alarm-description "Alarm when DB connections are high" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 15 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## Phase 8: Post-Deployment Testing

### Step 1: Functional Testing
- [ ] User signup works
- [ ] Email OTP delivery works
- [ ] Phone verification works
- [ ] Schedule creation works
- [ ] Wake-up calls are delivered
- [ ] Welcome email is sent

### Step 2: Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database query performance acceptable

### Step 3: Monitoring Verification
- [ ] CloudWatch logs are being collected
- [ ] Application metrics are visible
- [ ] Database performance insights enabled

## Troubleshooting Commands

### Application Logs
```bash
eb logs --all
```

### Database Status
```bash
aws rds describe-db-instances --db-instance-identifier kickass-morning-prod-db
```

### Environment Health
```bash
eb health --refresh
```

### Test Database Connection from EB
```bash
eb ssh
sudo -u webapp psql "$DATABASE_URL" -c "SELECT version();"
```

## Security Checklist

- [ ] RDS security group only allows access from EB instances
- [ ] Database has encryption at rest enabled
- [ ] SSL certificate is properly configured
- [ ] Environment variables are set securely
- [ ] IAM roles follow principle of least privilege
- [ ] Backup retention is configured (7 days)

## Cost Optimization

### Current Estimated Monthly Costs:
- EB Environment (t3.small): ~$15-20
- RDS (db.t3.micro): ~$12-15
- Data Transfer: ~$5-10
- **Total: ~$32-45/month**

### Cost Monitoring:
```bash
# Set up billing alerts
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json
```

## Backup & Recovery

### Database Backups
- Automated backups: 7 days retention
- Manual snapshot before major updates

### Application Backups
- Code: Git repository
- Configuration: Infrastructure as Code

### Recovery Testing
- [ ] Test RDS point-in-time recovery
- [ ] Test application deployment rollback
- [ ] Document recovery procedures

---

**Deployment Date**: _________________
**Database Endpoint**: _________________
**Application URL**: _________________
**SSL Certificate ARN**: _________________

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________