# Firebase reCAPTCHA Production Troubleshooting Guide

## Current Issue
Getting "reCAPTCHA not initialized" error in production on AWS EC2.

## Environment Variables Required
Add these to `/opt/kickass-morning/.env`:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com  
VITE_FIREBASE_PROJECT_ID=your_project_id

# reCAPTCHA Configuration
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
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

### Check Environment Variables on EC2:
```bash
cd /opt/kickass-morning
cat .env | grep VITE_
```

### Check if Firebase packages are installed:
```bash
npm list firebase
npm list @firebase/auth
```

### Restart Application:
```bash
sudo pm2 restart kickass-morning
sudo pm2 logs kickass-morning --lines 50
```

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