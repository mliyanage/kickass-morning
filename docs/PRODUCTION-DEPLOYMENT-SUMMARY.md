# Production Deployment Summary

## Quick Start Commands

### 1. Install EB CLI
```bash
pip install awsebcli
```

### 2. Initialize and Deploy
```bash
# Initialize EB application
eb init
# Select: Node.js 20, region us-east-1, application name: kickass-morning

# Create production environment
eb create production --instance-types t3.small

# Set environment variables (replace with your actual values)
eb setenv \
  DATABASE_URL="postgresql://username:password@your-rds-endpoint:5432/database" \
  MAILJET_API_KEY="your_mailjet_api_key" \
  MAILJET_SECRET_KEY="your_mailjet_secret_key" \
  TWILIO_ACCOUNT_SID="your_twilio_sid" \
  TWILIO_AUTH_TOKEN="your_twilio_token" \
  TWILIO_PHONE_NUMBER="your_twilio_number" \
  OPENAI_API_KEY="your_openai_key" \
  NODE_ENV="production"

# Deploy application
eb deploy

# Open in browser
eb open
```

## Database Setup (Separate RDS)

### Create RDS Instance
```bash
aws rds create-db-instance \
  --db-instance-identifier kickass-morning-prod-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username kickassuser \
  --master-user-password "YOUR_SECURE_PASSWORD" \
  --allocated-storage 20 \
  --db-name kickassmorning \
  --backup-retention-period 7 \
  --storage-encrypted
```

### Run Schema Migration
```bash
# After RDS is available, run migration
export DATABASE_URL="postgresql://kickassuser:password@your-rds-endpoint:5432/kickassmorning"
npm run db:push
```

## Key Files Created for Deployment

- `.ebextensions/` - EB configuration files
- `.ebignore` - Files to exclude from deployment
- `docs/AWS-DEPLOYMENT-CHECKLIST.md` - Detailed step-by-step guide
- `docs/deployment-environments.md` - Complete deployment documentation

## Environment Variables Needed

```bash
DATABASE_URL=postgresql://username:password@rds-endpoint:5432/database
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
```

## Monitoring Commands

```bash
# Check application health
eb health

# View logs
eb logs --all

# Check deployment status
eb status
```

## Cost Estimate
- EB Environment (t3.small): ~$15-20/month
- RDS (db.t3.micro): ~$12-15/month
- **Total: ~$30-40/month**

## Security Features
- Database encryption at rest
- HTTPS with SSL certificate
- VPC security groups
- Separate database instance (not EB-managed)
- Session-based authentication

## Next Steps After Deployment
1. Configure custom domain (optional)
2. Set up SSL certificate
3. Configure CloudWatch monitoring
4. Test all functionality
5. Set up backup monitoring

For detailed instructions, see `docs/AWS-DEPLOYMENT-CHECKLIST.md`