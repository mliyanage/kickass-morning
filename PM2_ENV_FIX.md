# PM2 Environment Variables Fix for Production

## Problem
PM2 process is not loading environment variables from .env file, causing Firebase to fail with "invalid-api-key" error.

## Solution 1: Update PM2 Ecosystem Config

Create/update `/opt/kickass-morning/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'kickass-morning',
    script: './app/dist/index.js',
    cwd: '/opt/kickass-morning',
    env_file: '/opt/kickass-morning/.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/opt/kickass-morning/logs/error.log',
    out_file: '/opt/kickass-morning/logs/out.log',
    log_file: '/opt/kickass-morning/logs/combined.log',
    time: true
  }]
};
```

## Solution 2: Manual Environment Loading

Add environment variables directly to PM2 config:

```javascript
module.exports = {
  apps: [{
    name: 'kickass-morning',
    script: './app/dist/index.js',
    cwd: '/opt/kickass-morning',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // Database
      DATABASE_URL: 'postgresql://kickassuser:uYMgM3aaZjkel7nMLDS6@kickass-morning-db.cbsci0wy027n.us-east-2.rds.amazonaws.com:5432/kickassmorning?sslmode=require&sslcert=disable',
      // Firebase
      VITE_FIREBASE_API_KEY: 'AIzaSyA79ZNMpiDovUUd0KYOjyXg_jTm6735NCs',
      VITE_FIREBASE_AUTH_DOMAIN: 'kickass-2673d.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'kickass-2673d',
      VITE_RECAPTCHA_SITE_KEY: '6Lexp6ErAAAAAFyKw3DM3z1Zuk8KuxGo1WeW3Yt-',
      // Other APIs
      OPENAI_API_KEY: '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',
      TWILIO_ACCOUNT_SID: 'AC69753b88fcb09ded7765ab0ba35f782c',
      TWILIO_AUTH_TOKEN: '69317614e9c9e6790189df510a5d5cff',
      TWILIO_PHONE_NUMBER: '+18312436088',
      MAILJET_API_KEY: '89040adbb9867fe1b2dcb39c87c38982',
      MAILJET_SECRET_KEY: 'bdbf5dd49ebc0f5081cb7a4a35daed56',
      ELEVENLABS_API_KEY: 'sk_0e033947065e45131a2b8993d6e30abe38cecb903cfd154e',
      SESSION_SECRET: 'fhUPGQ715wvdSKApkKt7P0KXDpuijJa0BVEr5i/3XXe4kragziyms6C9yM9+spUnKXbffrYA46qw8o4AKDI/Vw==',
      VITE_GA_MEASUREMENT_ID: 'G-C42Z07PLFH'
    }
  }]
};
```

## Solution 3: Export Environment Variables

```bash
# Load environment variables into current shell
cd /opt/kickass-morning
set -a
source .env
set +a

# Start PM2 with inherited environment
pm2 start ecosystem.config.js
```

## Commands to Fix

```bash
# 1. Stop current PM2 process
pm2 stop kickass-morning

# 2. Update ecosystem config (choose solution 1 or 2 above)
sudo nano /opt/kickass-morning/ecosystem.config.js

# 3. Restart with new config
pm2 start /opt/kickass-morning/ecosystem.config.js

# 4. Verify environment variables are loaded
pm2 show kickass-morning
pm2 logs kickass-morning --lines 10
```

## Verification

After applying the fix, you should see Firebase debug logs in production showing the correct configuration.