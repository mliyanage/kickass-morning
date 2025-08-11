# EC2 Deployment Guide - Firebase Environment Variables

## RESOLVED: Firebase Environment Variables Issue ✅

**Problem**: Firebase variables (VITE_*) are client-side and must be embedded during build, not loaded at runtime.

**Root Cause**: Server variables (MAILJET, TWILIO) work at runtime, but VITE_ variables need build-time embedding.

## Production Deployment Process

### Correct Build Command for EC2:
```bash
cd /opt/kickass-morning/app
set -a; source ../.env; set +a; npm run build
pm2 restart kickass-morning
```

This process:
1. Exports all .env variables to shell environment
2. Builds frontend with VITE_ variables embedded
3. Restarts the PM2 process

## Correct Environment Variables for Production
Add these exact values to `/opt/kickass-morning/.env`:

```bash
# Firebase Configuration (VERIFIED CORRECT)
VITE_FIREBASE_API_KEY=AIzaSyA79ZNMpiDovUUd0KYOjyXg_jTm6735NCs
VITE_FIREBASE_AUTH_DOMAIN=kickass-2673d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kickass-2673d

# reCAPTCHA Configuration (VERIFIED CORRECT)
VITE_RECAPTCHA_SITE_KEY=6Lexp6ErAAAAAFyKw3DM3z1Zuk8KuxGo1WeW3Yt-

# Optional Firebase Config (not required but good to have)
VITE_FIREBASE_STORAGE_BUCKET=kickass-2673d.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=963509487606
VITE_FIREBASE_APP_ID=1:963509487606:web:e7352f74d2679cbe09a9d7
VITE_FIREBASE_MEASUREMENT_ID=G-BD383M4NDV
```

## Steps to Get Correct reCAPTCHA Site Key

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**
3. **Navigate to Authentication > Sign-in method**
4. **Click on Phone provider**
5. **Look for "reCAPTCHA settings" section**
6. **Copy the Site Key** (should start with `6Le...`)

## Common Issues & Solutions

### 1. Wrong reCAPTCHA Key Format
- **Problem**: Using wrong type of reCAPTCHA key
- **Solution**: Must use Firebase Phone Auth reCAPTCHA site key, not regular Google reCAPTCHA

### 2. Domain Authorization
- **Problem**: Domain not authorized in Firebase console
- **Solution**: Add your production domain to Firebase authorized domains

### 3. Invisible vs Visible reCAPTCHA
- **Problem**: Wrong reCAPTCHA type configured
- **Solution**: Firebase Phone Auth requires visible reCAPTCHA (size: 'normal')

## Debug Commands

### Fix File Permissions Issue:
```bash
# Current issue: ec2-user runs PM2 but kickass user owns .env file
cd /opt/kickass-morning

# Option 1: Change .env ownership to ec2-user
sudo chown ec2-user:ec2-user .env

# Option 2: Add ec2-user to kickass group and make .env readable
sudo usermod -a -G kickass ec2-user
sudo chmod 640 .env

# Option 3: Move .env to app directory where ec2-user has access
sudo cp .env app/.env
sudo chown ec2-user:ec2-user app/.env
```

### Check Environment Variables on EC2:
```bash
cd /opt/kickass-morning
cat .env | grep VITE_

# Verify ec2-user can read the file
sudo -u ec2-user cat .env | grep VITE_
```

### Check if Firebase packages are installed:
```bash
npm list firebase
npm list @firebase/auth
```

### CRITICAL: Correct Build Process for Production:
```bash
# Navigate to app directory
cd /opt/kickass-morning/app

# Load environment variables and build with VITE_ variables embedded
set -a; source ../.env; set +a; npm run build

# Restart PM2 process
pm2 restart kickass-morning

# Verify deployment
pm2 logs kickass-morning --lines 20
```

**Why This Fixes It**: The `set -a; source ../.env; set +a` command exports all environment variables to the shell before building, allowing Vite to embed the VITE_ variables into the frontend bundle.

## Production-Specific reCAPTCHA Setup

### 1. Authorize Production Domain
In Firebase Console > Authentication > Settings > Authorized domains:
- Add your production domain (e.g., `your-domain.com`)
- Add any subdomains if needed

### 2. Enable Phone Authentication
In Firebase Console > Authentication > Sign-in method:
- Ensure Phone provider is enabled
- Configure phone number testing (if needed for testing)

### 3. Test reCAPTCHA Directly
Add this to your production environment temporarily to test:
```html
<div id="recaptcha-test"></div>
<script>
const testRecaptcha = () => {
  const siteKey = 'YOUR_SITE_KEY';
  const container = document.getElementById('recaptcha-test');
  // Test reCAPTCHA initialization
  new RecaptchaVerifier(auth, 'recaptcha-test', { size: 'normal' });
};
</script>
```

## Expected Site Key Format
Firebase reCAPTCHA site keys should look like:
```
6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

## If Still Not Working

1. **Check Firebase project settings**
2. **Verify all environment variables are loaded**
3. **Check browser console for specific Firebase errors**
4. **Test with a simple HTML page first**
5. **Contact Firebase support if configuration issues persist**