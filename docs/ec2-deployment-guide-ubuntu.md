# EC2 Deployment Guide for Ubuntu 22.04 LTS

## Overview

Deploy KickAss Morning on Ubuntu 22.04 LTS with improved performance and better npm build support. This guide addresses the memory and build issues commonly experienced with Amazon Linux on t2.micro instances.

## Architecture

- **EC2 Instance**: Ubuntu 22.04 LTS on t4g.micro (ARM-based, better performance)
- **Database**: Separate RDS PostgreSQL instance
- **Reverse Proxy**: Nginx for HTTPS and static file serving
- **Process Manager**: PM2 for application lifecycle management
- **SSL**: Let's Encrypt via Certbot

## Cost Comparison

**EC2 Setup (Ubuntu + t4g.micro):**
- t4g.micro EC2 instance: ~$6-8/month (ARM-based, more efficient)
- RDS db.t4g.micro: ~$10-12/month
- **Total: ~$16-20/month** (better performance than Amazon Linux setup)

## Prerequisites

- AWS account with EC2 and RDS access
- Domain name (for SSL certificate)
- All API keys (Twilio, Mailjet, OpenAI, etc.)
- SSH key pair for EC2 access

## Phase 1: RDS Database Setup

### 1. Create RDS PostgreSQL Instance

```bash
# Create security group for RDS
aws ec2 create-security-group \
  --group-name kickass-morning-rds-sg \
  --description "PostgreSQL access for KickAss Morning"

export RDS_SG_ID="sg-xxxxxxxxx"

# Create RDS instance (ARM-based for better cost)
aws rds create-db-instance \
  --db-instance-identifier kickass-morning-db \
  --db-instance-class db.t4g.micro \
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

### 1. Launch Ubuntu EC2 Instance

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

# Launch Ubuntu 22.04 LTS instance (ARM-based t4g.micro for better performance)
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t4g.micro \
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

# SSH to instance (Ubuntu uses ubuntu user)
ssh -i your-key.pem ubuntu@$INSTANCE_IP
```

### 2. Install Dependencies (Ubuntu 22.04)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional tools
sudo apt install -y nginx git unzip postgresql-client build-essential

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node --version  # Should be v20.x
npm --version   # Should be 10.x
nginx -v        # Should show nginx version
```

### 3. Optimize System for npm Builds

```bash
# Increase swap space for better npm build performance
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Set npm to use more memory for builds
npm config set maxsockets 3
npm config set fund false
npm config set audit false

# Verify swap is active
free -h
```

### 4. Create Application User (Ubuntu)

```bash
# Create dedicated user for the application
sudo useradd -r -d /opt/kickass-morning -s /bin/bash -m kickass

# Create and set permissions for application directory
sudo mkdir -p /opt/kickass-morning
sudo chown kickass:kickass /opt/kickass-morning

# Set up Node.js PATH for kickass user
sudo -u kickass bash -c 'echo "export PATH=/usr/bin:$PATH" >> /opt/kickass-morning/.bashrc'
sudo -u kickass bash -c 'echo "export NODE_OPTIONS=\"--max-old-space-size=2048\"" >> /opt/kickass-morning/.bashrc'
```

## Phase 4: Application Deployment

### 1. Clone and Build Application

```bash
# Switch to application directory
sudo mkdir -p /opt/kickass-morning/app
sudo chown kickass:kickass /opt/kickass-morning/app

# Clone repository as kickass user
sudo -u kickass git clone https://github.com/mliyanage/kickass-morning.git /opt/kickass-morning/app

# Install dependencies with better memory management
cd /opt/kickass-morning/app
sudo -u kickass bash -c 'export NODE_OPTIONS="--max-old-space-size=2048" && npm ci'
```

### 2. Create Environment Configuration

```bash
# Create environment file
sudo tee /opt/kickass-morning/.env > /dev/null <<EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://kickassuser:your-password@your-rds-endpoint:5432/kickassmorning?sslmode=require
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
SESSION_SECRET=your_session_secret
STRIPE_SECRET_KEY=your_stripe_secret_key

# Firebase client-side variables (required at build time)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
VITE_GA_MEASUREMENT_ID=your_ga_measurement_id
VITE_POSTHOG_API_KEY=your_posthog_api_key
VITE_POSTHOG_HOST=your_posthog_host
EOF

# Secure environment file
sudo chmod 600 /opt/kickass-morning/.env
sudo chown kickass:kickass /opt/kickass-morning/.env
```

### 3. Build Application

```bash
# Build application with environment variables loaded
cd /opt/kickass-morning/app
sudo -u kickass bash -c 'set -a; source ../.env; set +a; export NODE_OPTIONS="--max-old-space-size=2048"; npm run build'

# Verify build completed
ls -la dist/
```

### 4. Create PM2 Configuration

```bash
# Create PM2 ecosystem file
cd /opt/kickass-morning
sudo tee ecosystem.config.js > /dev/null <<EOF
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
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=2048'
    },
    log_file: '/opt/kickass-morning/logs/combined.log',
    out_file: '/opt/kickass-morning/logs/out.log',
    error_file: '/opt/kickass-morning/logs/error.log',
    time: true
  }]
};
EOF

# Create logs directory
sudo mkdir -p /opt/kickass-morning/logs
sudo chown ubuntu:ubuntu /opt/kickass-morning/logs
```

## Phase 5: Database Migration

```bash
# Run database migration
cd /opt/kickass-morning/app
sudo -u kickass bash -c 'source /opt/kickass-morning/.env && npm run db:push'

# Verify database connection
source /opt/kickass-morning/.env
psql "$DATABASE_URL" -c "SELECT version();"
```

## Phase 6: Nginx Configuration

### 1. Create Nginx Configuration (Ubuntu)

```bash
# Remove default Nginx configuration
sudo rm -f /etc/nginx/sites-enabled/default

# Create configuration for the application
sudo tee /etc/nginx/sites-available/kickass-morning > /dev/null <<EOF
server {
    listen 80;
    server_name app.kickassmorning.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Client max body size for file uploads
    client_max_body_size 10M;

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

# Enable the site
sudo ln -s /etc/nginx/sites-available/kickass-morning /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

## Phase 7: SSL Certificate Setup

### 1. Install Certbot (Ubuntu)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d app.kickassmorning.com

# Set up automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test automatic renewal
sudo certbot renew --dry-run
```

## Phase 8: Start Application

### 1. Start with PM2

```bash
# Start application
cd /opt/kickass-morning
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup ubuntu -u ubuntu --hp /home/ubuntu
# Follow the command it outputs to set up startup script

# Verify application is running
pm2 status
```

### 2. Verify Deployment

```bash
# Check application status
pm2 status
pm2 logs kickass-morning --lines 50

# Test local connection
curl http://localhost:5000/api/health

# Test external connection (after DNS is configured)
curl https://app.kickassmorning.com

# Check Nginx status
sudo systemctl status nginx

# Test database connectivity
cd /opt/kickass-morning/app
source /opt/kickass-morning/.env
psql "$DATABASE_URL" -c "\dt"  # List tables
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
    create 0640 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Test logrotate
sudo logrotate -d /etc/logrotate.d/kickass-morning
```

### 2. System Monitoring Setup

```bash
# Install system monitoring tools
sudo apt install -y htop iotop nethogs

# Set up basic system monitoring script
sudo tee /opt/kickass-morning/monitor.sh > /dev/null <<'EOF'
#!/bin/bash
echo "=== System Status $(date) ==="
echo "Memory usage:"
free -h
echo "Disk usage:"
df -h
echo "PM2 status:"
pm2 status
echo "Nginx status:"
systemctl status nginx --no-pager -l
echo "============================="
EOF

sudo chmod +x /opt/kickass-morning/monitor.sh

# Set up hourly monitoring log
echo "0 * * * * /opt/kickass-morning/monitor.sh >> /opt/kickass-morning/logs/system.log 2>&1" | crontab -
```

## Management Commands

### Application Management

```bash
# Restart application
pm2 restart kickass-morning --update-env

# Reload application (zero downtime)
pm2 reload kickass-morning

# View logs
pm2 logs kickass-morning
pm2 logs kickass-morning --lines 100

# Monitor in real-time
pm2 monit

# Stop application
pm2 stop kickass-morning

# Delete application from PM2
pm2 delete kickass-morning
```

### System Management

```bash
# Check system resources
free -h
df -h
htop

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

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
cd /opt/kickass-morning/app
source /opt/kickass-morning/.env
psql "$DATABASE_URL"

# Run migrations
cd /opt/kickass-morning/app
sudo -u kickass bash -c 'source /opt/kickass-morning/.env && npm run db:push'

# Quick database verification commands
source /opt/kickass-morning/.env
psql "$DATABASE_URL" -c "\dt"                    # List tables
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"        # Count users
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM schedules;"    # Count schedules
```

## Deployment Updates

### 1. Deploy New Version

```bash
# Stop application
pm2 stop kickass-morning

# Update code
cd /opt/kickass-morning/app
sudo -u kickass git pull origin main

# Install dependencies
sudo -u kickass bash -c 'export NODE_OPTIONS="--max-old-space-size=2048" && npm ci'

# Build application with environment variables
sudo -u kickass bash -c 'set -a; source ../.env; set +a; export NODE_OPTIONS="--max-old-space-size=2048"; npm run build'

# Run any database migrations
sudo -u kickass bash -c 'source /opt/kickass-morning/.env && npm run db:push'

# Start application
cd /opt/kickass-morning
pm2 start ecosystem.config.js

# Or use reload for zero-downtime deployment
pm2 reload kickass-morning --update-env
```

### 2. Quick Update Script

```bash
# Create update script
sudo tee /opt/kickass-morning/update.sh > /dev/null <<'EOF'
#!/bin/bash
set -e

echo "Starting deployment update..."

# Stop application
pm2 stop kickass-morning

# Update code
cd /opt/kickass-morning/app
sudo -u kickass git pull origin main

# Install dependencies
sudo -u kickass bash -c 'export NODE_OPTIONS="--max-old-space-size=2048" && npm ci'

# Build application
sudo -u kickass bash -c 'set -a; source ../.env; set +a; export NODE_OPTIONS="--max-old-space-size=2048"; npm run build'

# Run migrations
sudo -u kickass bash -c 'source /opt/kickass-morning/.env && npm run db:push'

# Start application
cd /opt/kickass-morning
pm2 start ecosystem.config.js

echo "Deployment update completed!"
EOF

sudo chmod +x /opt/kickass-morning/update.sh
```

## Backup Strategy

### 1. Database Backups

```bash
# Create backup script
sudo tee /opt/kickass-morning/backup-db.sh > /dev/null <<'EOF'
#!/bin/bash
source /opt/kickass-morning/.env
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/kickass-morning/backups"

mkdir -p $BACKUP_DIR
pg_dump "$DATABASE_URL" > $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Database backup completed: db_backup_$DATE.sql"
EOF

sudo chmod +x /opt/kickass-morning/backup-db.sh
sudo mkdir -p /opt/kickass-morning/backups
sudo chown ubuntu:ubuntu /opt/kickass-morning/backups

# Set up daily backup cron
echo "0 2 * * * /opt/kickass-morning/backup-db.sh >> /opt/kickass-morning/logs/backup.log 2>&1" | crontab -
```

### 2. Application Backups

```bash
# Backup application files
sudo tar -czf /opt/kickass-morning/backups/app_backup_$(date +%Y%m%d).tar.gz \
  -C /opt/kickass-morning app .env ecosystem.config.js
```

## Troubleshooting

### Common Issues

1. **npm build fails with out of memory**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=2048"
   
   # Check swap is active
   free -h
   
   # Retry build with memory limit
   sudo -u kickass bash -c 'export NODE_OPTIONS="--max-old-space-size=2048"; npm run build'
   ```

2. **Application won't start**
   ```bash
   # Check PM2 logs
   pm2 logs kickass-morning
   
   # Check if port 5000 is available
   sudo lsof -i :5000
   
   # Check dependencies
   cd /opt/kickass-morning/app && npm list
   ```

3. **Database connection issues**
   ```bash
   # Test database connectivity
   source /opt/kickass-morning/.env
   psql "$DATABASE_URL" -c "SELECT version();"
   
   # Check security group settings
   # Verify RDS endpoint is accessible from EC2
   telnet your-rds-endpoint 5432
   ```

4. **Build hangs during npm install**
   ```bash
   # Clear npm cache
   sudo -u kickass npm cache clean --force
   
   # Use alternative registry
   sudo -u kickass npm install --registry https://registry.npmjs.org/
   
   # Try with verbose output
   sudo -u kickass npm install --verbose
   ```

5. **Nginx configuration issues**
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Check logs
   sudo tail -f /var/log/nginx/error.log
   
   # Restart nginx
   sudo systemctl restart nginx
   ```

6. **SSL certificate issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate
   sudo certbot renew --dry-run
   
   # Check certificate expiry
   echo | openssl s_client -connect app.kickassmorning.com:443 2>/dev/null | openssl x509 -noout -dates
   ```

7. **System running out of disk space**
   ```bash
   # Check disk usage
   df -h
   
   # Clean up logs
   pm2 flush
   sudo journalctl --vacuum-time=2d
   
   # Clean up old backups
   find /opt/kickass-morning/backups -mtime +7 -delete
   ```

## Security Considerations

- EC2 security group restricts access to necessary ports only
- RDS security group allows access only from EC2 instance
- Application runs under dedicated user account
- Environment variables stored securely with proper permissions
- SSL/TLS encryption for all traffic
- Regular security updates via `sudo apt update && sudo apt upgrade`
- Fail2ban for SSH protection (optional)
- UFW firewall configuration (optional)

## Performance Optimization

### 1. System Optimization

```bash
# Enable BBR congestion control for better network performance
echo 'net.core.default_qdisc=fq' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_congestion_control=bbr' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Optimize file limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

### 2. Application Optimization

```bash
# Use PM2 cluster mode for better CPU utilization (if needed)
# Update ecosystem.config.js:
# instances: 'max'  # Use all available CPU cores
```

## Cost Optimization

- Use t4g.micro instances (ARM-based, more efficient)
- Set up CloudWatch alarms for resource monitoring
- Consider reserved instances for long-term production
- Monitor data transfer costs
- Use EBS gp3 volumes for better price/performance
- Set up automatic scaling if traffic varies

---

**Total Setup Time**: 2-3 hours
**Monthly Cost**: ~$16-20 (better price/performance than Amazon Linux)
**Performance**: Excellent (ARM-based t4g.micro + Ubuntu optimizations)
**Maintenance**: Moderate (automated updates available)
**Flexibility**: High (full server control + better package management)

## Key Advantages of Ubuntu Setup

1. **Better npm performance**: More memory efficient builds
2. **ARM-based t4g.micro**: Better price/performance ratio
3. **APT package manager**: More reliable than YUM
4. **Better community support**: More documentation and tutorials
5. **Long-term support**: Ubuntu 22.04 LTS supported until 2027
6. **Swap optimization**: Better handling of memory-intensive builds