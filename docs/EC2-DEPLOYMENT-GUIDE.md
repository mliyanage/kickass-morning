# EC2 Manual Deployment Guide

## Overview

Deploy KickAss Morning directly on an EC2 instance with complete control over the server environment. This approach offers maximum flexibility and potentially lower costs compared to Elastic Beanstalk.

## Architecture

- **EC2 Instance**: Ubuntu 22.04 LTS with Node.js 20
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

# SSH to instance
ssh -i your-key.pem ubuntu@$INSTANCE_IP
```

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional tools
sudo apt install -y nginx git unzip postgresql-client

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node --version  # Should be v20.x
npm --version   # Should be 10.x
```

### 3. Create Application User

```bash
# Create dedicated user for the application
sudo adduser --system --group --home /opt/kickass-morning kickass

# Switch to application directory
sudo mkdir -p /opt/kickass-morning
sudo chown kickass:kickass /opt/kickass-morning
```

## Phase 4: Application Deployment

### 1. Upload Application Code

```bash
# Option A: Upload pre-built package
# Build locally first: npm run build
# Create deployment package: zip -r kickass-morning.zip dist/ package.json .ebextensions/ shared/
# Upload to EC2:
scp -i your-key.pem kickass-morning.zip ubuntu@$INSTANCE_IP:/tmp/

# Option B: Clone and build on server
sudo -u kickass git clone https://github.com/your-repo/kickass-morning.git /opt/kickass-morning/app
cd /opt/kickass-morning/app
sudo -u kickass npm ci --only=production
sudo -u kickass npm run build
```

### 2. Create Environment Configuration

```bash
# Create environment file
sudo -u kickass tee /opt/kickass-morning/.env > /dev/null <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://kickassuser:your-password@your-rds-endpoint:5432/kickassmorning
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
OPENAI_API_KEY=your_openai_key
EOF

# Secure environment file
sudo chmod 600 /opt/kickass-morning/.env
```

### 3. Create PM2 Configuration

```bash
# Create PM2 ecosystem file
sudo -u kickass tee /opt/kickass-morning/ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [{
    name: 'kickass-morning',
    script: './dist/index.js',
    cwd: '/opt/kickass-morning/app',
    env_file: '/opt/kickass-morning/.env',
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/opt/kickass-morning/logs/error.log',
    out_file: '/opt/kickass-morning/logs/out.log',
    log_file: '/opt/kickass-morning/logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
sudo mkdir -p /opt/kickass-morning/logs
sudo chown kickass:kickass /opt/kickass-morning/logs
```

## Phase 5: Database Migration

```bash
# Run database migration
cd /opt/kickass-morning/app
sudo -u kickass bash -c 'source /opt/kickass-morning/.env && npm run db:push'
```

## Phase 6: Nginx Configuration

### 1. Create Nginx Configuration

```bash
# Create site configuration
sudo tee /etc/nginx/sites-available/kickass-morning > /dev/null <<EOF
server {
    listen 80;
    server_name kickassmorning.com www.kickassmorning.com;

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
        proxy_pass http://localhost:3000;
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

# Enable site
sudo ln -s /etc/nginx/sites-available/kickass-morning /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Phase 7: SSL Certificate Setup

### 1. Install Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d kickassmorning.com -d www.kickassmorning.com

# Set up automatic renewal
sudo systemctl enable certbot.timer
```

## Phase 8: Start Application

### 1. Start with PM2

```bash
# Start application
cd /opt/kickass-morning
sudo -u kickass pm2 start ecosystem.config.js

# Save PM2 configuration
sudo -u kickass pm2 save

# Set up PM2 to start on boot
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u kickass --hp /opt/kickass-morning
```

### 2. Verify Deployment

```bash
# Check application status
sudo -u kickass pm2 status
sudo -u kickass pm2 logs

# Test local connection
curl http://localhost:3000/api/health

# Test external connection
curl https://kickassmorning.com
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
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure CloudWatch (optional)
# Follow AWS CloudWatch agent configuration guide
```

## Management Commands

### Application Management

```bash
# Restart application
sudo -u kickass pm2 restart kickass-morning

# View logs
sudo -u kickass pm2 logs kickass-morning

# Monitor in real-time
sudo -u kickass pm2 monit

# Stop application
sudo -u kickass pm2 stop kickass-morning
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
# Connect to database
psql "$DATABASE_URL"

# Run migrations
cd /opt/kickass-morning/app
sudo -u kickass bash -c 'source /opt/kickass-morning/.env && npm run db:push'
```

## Deployment Updates

### 1. Deploy New Version

```bash
# Stop application
sudo -u kickass pm2 stop kickass-morning

# Update code (if using git)
cd /opt/kickass-morning/app
sudo -u kickass git pull origin main
sudo -u kickass npm ci --only=production
sudo -u kickass npm run build

# Run any database migrations
sudo -u kickass bash -c 'source /opt/kickass-morning/.env && npm run db:push'

# Start application
sudo -u kickass pm2 start kickass-morning
```

### 2. Zero-Downtime Deployment

```bash
# Use PM2 reload for zero-downtime
sudo -u kickass pm2 reload kickass-morning
```

## Backup Strategy

### 1. Database Backups

```bash
# Create backup script
sudo tee /opt/kickass-morning/backup-db.sh > /dev/null <<EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
pg_dump "\$DATABASE_URL" > /opt/kickass-morning/backups/db_backup_\$DATE.sql
# Keep only last 7 days
find /opt/kickass-morning/backups -name "db_backup_*.sql" -mtime +7 -delete
EOF

sudo chmod +x /opt/kickass-morning/backup-db.sh
sudo mkdir -p /opt/kickass-morning/backups

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
   sudo -u kickass pm2 logs kickass-morning
   ```

2. **Database connection issues**
   ```bash
   # Test database connectivity
   psql "$DATABASE_URL" -c "SELECT version();"
   ```

3. **Nginx configuration issues**
   ```bash
   sudo nginx -t
   sudo journalctl -u nginx
   ```

4. **SSL certificate issues**
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