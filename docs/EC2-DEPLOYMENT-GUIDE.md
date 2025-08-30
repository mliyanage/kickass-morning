# EC2 Manual Deployment Guide for Amazon Linux

## Overview

Deploy KickAss Morning directly on an EC2 instance with complete control over the server environment. This approach offers maximum flexibility and potentially lower costs compared to Elastic Beanstalk.

## Architecture

- **EC2 Instance**: Amazon Linux 2023 with Node.js 20
- **Database**: Separate RDS PostgreSQL instance
- **Reverse Proxy**: Nginx for HTTPS and static file serving
- **Process Manager**: PM2 for application lifecycle management
- **SSL**: Let's Encrypt via Certbot

## Cost Comparison

**EC2 Setup:**
- t3.micro EC2 instance: ~$8-10/month
- RDS db.t3.micro: ~$12-15/month
- **Total: ~$20-25/month** (vs $30-40 for EB)

## Prerequisites

- AWS account with EC2 and RDS access
- Domain name (for SSL certificate)
- All API keys (Twilio, Mailjet, OpenAI, etc.)

## Phase 1: RDS Database Setup

### 1. Create RDS PostgreSQL Instance

```bash
# Create security group for RDS
aws ec2 create-security-group \
  --group-name kickass-morning-rds-sg \
  --description "PostgreSQL access for KickAss Morning"

export RDS_SG_ID="sg-xxxxxxxxx"

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier kickass-morning-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username kickassuser \
  --master-user-password "$(openssl rand -base64 32)" \
  --allocated-storage 20 \
  --db-name kickassmorning \
  --vpc-security-group-ids $RDS_SG_ID \
  --backup-retention-period 7 \
  --storage-encrypted
```

### 2. Get Database Endpoint

```bash
# Wait for database to be available
aws rds wait db-instance-available --db-instance-identifier kickass-morning-db

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier kickass-morning-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

## Phase 2: EC2 Instance Setup

### 1. Launch EC2 Instance

```bash
# Create security group for EC2
aws ec2 create-security-group \
  --group-name kickass-morning-web-sg \
  --description "Web server for KickAss Morning"

export WEB_SG_ID="sg-yyyyyyyyy"

# Allow HTTP, HTTPS, and SSH
aws ec2 authorize-security-group-ingress \
  --group-id $WEB_SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $WEB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $WEB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --count 1 \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --security-group-ids $WEB_SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=kickass-morning-web}]'
```

### 2. Update RDS Security Group

```bash
# Allow PostgreSQL access from EC2
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $WEB_SG_ID
```

## Phase 3: Server Configuration

### 1. Connect to EC2 Instance

```bash
# Get instance public IP
export INSTANCE_IP=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=kickass-morning-web" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# SSH to instance (Amazon Linux uses ec2-user)
ssh -i your-key.pem ec2-user@$INSTANCE_IP
```

### 2. Install Dependencies (Amazon Linux)

```bash
# Update system
sudo yum update -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install additional tools
sudo yum install -y nginx git unzip postgresql15

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node --version  # Should be v20.x
npm --version   # Should be 10.x
```

### 3. Create Application User (Amazon Linux)

```bash
# Create dedicated user for the application
sudo useradd -r -d /opt/kickass-morning -s /bin/bash kickass

# Create and set permissions for application directory
sudo mkdir -p /opt/kickass-morning
sudo chown kickass:kickass /opt/kickass-morning

# Find current PATH and npm location for proper user setup
echo "Current PATH: $PATH"
echo "NPM location: $(which npm)"

# Set up proper PATH for kickass user (copy from current user)
echo "export PATH=$PATH" | sudo tee /opt/kickass-morning/.bashrc
sudo chown kickass:kickass /opt/kickass-morning/.bashrc
```

## Phase 4: Application Deployment

### 1. Upload Application Code

```bash
# RECOMMENDED: Upload pre-built package
# Build locally first:
npm run build

# Create deployment package:
zip -r kickass-morning-deploy.zip \
  dist/ \
  package.json \
  package-lock.json \
  shared/ \
  audio-cache/ \
  -x "node_modules/*" "*.git*" "client/*"

# Upload to EC2:
scp -i your-key.pem kickass-morning-deploy.zip ubuntu@$INSTANCE_IP:/tmp/

# Extract on server:
sudo mkdir -p /opt/kickass-morning/app
sudo chown kickass:kickass /opt/kickass-morning/app
cd /opt/kickass-morning/app
sudo -u kickass unzip /tmp/kickass-morning-deploy.zip

# Install only production dependencies:
sudo -u kickass npm ci --only=production
```

### 2. Create Environment Configuration

```bash
# Create environment file with proper SSL configuration for RDS
sudo tee /opt/kickass-morning/.env > /dev/null <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://kickassuser:your-password@your-rds-endpoint:5432/kickassmorning?sslmode=require
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
OPENAI_API_KEY=your_openai_key
EOF

# Secure environment file
sudo chmod 600 /opt/kickass-morning/.env
sudo chown kickass:kickass /opt/kickass-morning/.env
```

### 3. Create PM2 Configuration

```bash
# Create PM2 ecosystem file (managed by ec2-user)
cd /opt/kickass-morning
tee ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [{
    name: 'kickass-morning',
    script: './app/dist/index.js',
    cwd: '/opt/kickass-morning',
    env_file: '/opt/kickass-morning/.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Create logs directory
sudo mkdir -p /opt/kickass-morning/logs
sudo chown ec2-user:ec2-user /opt/kickass-morning/logs
```

## Phase 5: Database Migration

```bash
# Run database migration with SSL certificate workaround
cd /opt/kickass-morning/app

# Method 1: Run as current user (recommended)
export NODE_TLS_REJECT_UNAUTHORIZED=0
source /opt/kickass-morning/.env && npm run db:push

# Method 2: Run as kickass user (if PATH is set correctly)
sudo -u kickass bash -c 'export NODE_TLS_REJECT_UNAUTHORIZED=0 && cd /opt/kickass-morning/app && source /opt/kickass-morning/.bashrc && source /opt/kickass-morning/.env && npm run db:push'

# Verify database connection
NODE_TLS_REJECT_UNAUTHORIZED=0 psql "$DATABASE_URL" -c "SELECT version();"
```

## Phase 6: Nginx Configuration

### 1. Create Nginx Configuration (Amazon Linux)

```bash
# Check Nginx configuration directory structure
ls -la /etc/nginx/

# For Amazon Linux, create configuration directly in conf.d
sudo tee /etc/nginx/conf.d/kickass-morning.conf > /dev/null <<EOF
server {
    listen 80;
    server_name app.kickassmorning.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Static files
    location /audio-cache/ {
        alias /opt/kickass-morning/app/audio-cache/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # API and application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Remove default configuration if it exists
sudo rm -f /etc/nginx/conf.d/default.conf

# Test configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

## Phase 7: SSL Certificate Setup

### 1. Install Certbot

```bash
# Install Certbot (Amazon Linux)
sudo yum install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d app.kickassmorning.com

# Set up automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Phase 8: Start Application

### 1. Start with PM2

```bash
# Start application (using ec2-user)
cd /opt/kickass-morning
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot (follow the command output)
pm2 startup
```

### 2. Verify Deployment

```bash
# Check application status
pm2 status
pm2 logs kickass-morning

# Test local connection
curl http://localhost:5000/api/health

# Test external connection
curl https://app.kickassmorning.com
```

## Phase 9: Monitoring and Maintenance

### 1. Set Up Log Rotation

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/kickass-morning > /dev/null <<EOF
/opt/kickass-morning/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 kickass kickass
    postrotate
        sudo -u kickass pm2 reloadLogs
    endscript
}
EOF
```

### 2. Set Up CloudWatch Monitoring

```bash
# Install CloudWatch agent (Amazon Linux)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U amazon-cloudwatch-agent.rpm

# Configure CloudWatch (optional)
# Follow AWS CloudWatch agent configuration guide
```

## Management Commands

### Application Management

```bash
# Restart application
pm2 restart kickass-morning --update-env

# View logs
pm2 logs kickass-morning

# Monitor in real-time
pm2 monit

# Stop application
pm2 stop kickass-morning
```

### System Management

```bash
# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Check SSL certificate
sudo certbot certificates

# Renew SSL certificate (manual)
sudo certbot renew
```

### Database Management

```bash
# Connect to database (with SSL workaround)
cd /opt/kickass-morning/app
source /opt/kickass-morning/.env
NODE_TLS_REJECT_UNAUTHORIZED=0 psql "$DATABASE_URL"

# Run migrations
export NODE_TLS_REJECT_UNAUTHORIZED=0
source /opt/kickass-morning/.env && npm run db:push

# Quick database verification commands
NODE_TLS_REJECT_UNAUTHORIZED=0 psql "$DATABASE_URL" -c "\dt"  # List tables
NODE_TLS_REJECT_UNAUTHORIZED=0 psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"  # Count users
```

## Deployment Updates

### 1. Deploy New Version

```bash
# Stop application
pm2 stop kickass-morning

# Update code (if using git)
cd /opt/kickass-morning/app
sudo -u kickass git pull origin main

# Install dependencies (as ec2-user but install to app directory)
cd /opt/kickass-morning/app
npm ci --only=production

# Build with environment variables
set -a; source ../.env; set +a; npm run build

# Run any database migrations (with SSL workaround)
export NODE_TLS_REJECT_UNAUTHORIZED=0
source /opt/kickass-morning/.env && npm run db:push

# Start application
cd /opt/kickass-morning
pm2 start ecosystem.config.js
```

### 2. Zero-Downtime Deployment

```bash
# Use PM2 reload for zero-downtime
pm2 reload kickass-morning
```

## Backup Strategy

### 1. Database Backups

```bash
# Create backup script with SSL workaround
sudo tee /opt/kickass-morning/backup-db.sh > /dev/null <<'EOF'
#!/bin/bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
source /opt/kickass-morning/.env
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump "$DATABASE_URL" > /opt/kickass-morning/backups/db_backup_$DATE.sql
# Keep only last 7 days
find /opt/kickass-morning/backups -name "db_backup_*.sql" -mtime +7 -delete
EOF

sudo chmod +x /opt/kickass-morning/backup-db.sh
sudo mkdir -p /opt/kickass-morning/backups
sudo chown kickass:kickass /opt/kickass-morning/backups

# Set up daily backup cron
echo "0 2 * * * /opt/kickass-morning/backup-db.sh" | sudo -u kickass crontab -
```

### 2. Application Backups

```bash
# Backup application files
sudo tar -czf /opt/kickass-morning/backups/app_backup_$(date +%Y%m%d).tar.gz \
  -C /opt/kickass-morning app .env ecosystem.config.js
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   pm2 logs kickass-morning
   # Check if all dependencies are installed
   cd /opt/kickass-morning/app && npm list
   ```

2. **Database connection issues**
   ```bash
   # Test database connectivity with SSL workaround
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   source /opt/kickass-morning/.env
   psql "$DATABASE_URL" -c "SELECT version();"
   
   # Test network connectivity
   telnet your-rds-endpoint 5432
   ```

3. **NPM command not found for kickass user**
   ```bash
   # Check npm location
   which npm
   
   # Update kickass user's PATH
   echo "export PATH=$(echo $PATH)" | sudo tee /opt/kickass-morning/.bashrc
   
   # Or use full path
   sudo -u kickass $(which npm) --version
   ```

4. **SSL Certificate errors (self-signed certificate)**
   ```bash
   # Use NODE_TLS_REJECT_UNAUTHORIZED=0 for database operations
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   
   # Or download RDS certificate bundle
   wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -O /opt/kickass-morning/rds-ca-bundle.pem
   # Update DATABASE_URL to include: ?sslmode=require&sslrootcert=/opt/kickass-morning/rds-ca-bundle.pem
   ```

5. **Nginx configuration issues**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

6. **SSL certificate issues**
   ```bash
   sudo certbot certificates
   sudo certbot renew --dry-run
   ```

## Security Considerations

- EC2 security group restricts access to necessary ports only
- RDS security group allows access only from EC2 instance
- Application runs under dedicated user account
- Environment variables stored securely
- SSL/TLS encryption for all traffic
- Regular security updates via `sudo apt upgrade`

## Cost Optimization

- Use t3.micro instances (burstable performance)
- Set up CloudWatch alarms for resource monitoring
- Consider reserved instances for production
- Monitor data transfer costs
- Use EBS GP2 volumes for cost-effective storage

---

**Total Setup Time**: 2-3 hours
**Monthly Cost**: ~$20-25 (vs $30-40 for Elastic Beanstalk)
**Maintenance**: Moderate (manual updates, monitoring)
**Flexibility**: High (full server control)