import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// Lazy initialization - only initialize when needed
let app: any = null;
let auth: any = null;

const initializeFirebase = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return { app, auth };
};

export const getFirebaseAuth = () => {
  const { auth } = initializeFirebase();
  return auth;
};

// Initialize recaptcha verifier with site key and better error handling
export const initializeRecaptcha = (containerId: string): RecaptchaVerifier => {
  try {
    const firebaseAuth = getFirebaseAuth();
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    
    // Debug logging for production troubleshooting
    // Production logging removed for security
    
    if (!siteKey) {
      throw new Error('reCAPTCHA site key not configured. Check VITE_RECAPTCHA_SITE_KEY environment variable.');
    }

    // Ensure the DOM element exists
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`reCAPTCHA container element '${containerId}' not found in DOM`);
    }

    // Clear any existing reCAPTCHA in the container
    container.innerHTML = '';
    
    return new RecaptchaVerifier(firebaseAuth, containerId, {
      size: 'normal',
      callback: () => {
        console.log('reCAPTCHA verification successful');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired - user needs to solve it again');
      },
      'error-callback': (error: any) => {
        console.error('reCAPTCHA error:', error);
      }
    });
  } catch (error) {
    console.error('Failed to initialize reCAPTCHA:', error);
    throw error;
  }
};

// Send SMS verification code
export const sendVerificationCode = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
  try {
    const firebaseAuth = getFirebaseAuth();
    // Add timeout to prevent hanging promises
    const smsPromise = signInWithPhoneNumber(firebaseAuth, phoneNumber, recaptchaVerifier);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('SMS send timeout')), 30000)
    );
    return await Promise.race([smsPromise, timeoutPromise]);
  } catch (error) {
    throw error;
  }
};

// Verify SMS code
export const verifyCode = async (confirmationResult: any, code: string) => {
  try {
    // Add timeout to prevent hanging promises
    const verifyPromise = confirmationResult.confirm(code);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Code verification timeout')), 15000)
    );
    return await Promise.race([verifyPromise, timeoutPromise]);
  } catch (error) {
    throw error;
  }
};

// Get Firebase ID token for backend verification
export const getFirebaseToken = async (): Promise<string | null> => {
  try {
    const firebaseAuth = getFirebaseAuth();
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      // Add timeout to prevent hanging promises
      const tokenPromise = currentUser.getIdToken();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Token request timeout')), 10000)
      );
      return await Promise.race([tokenPromise, timeoutPromise]);
    }
    return null;
  } catch (error) {
    throw error;
  }
};

// Add global error handler to suppress reCAPTCHA timeout overlays
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message) {
      const message = event.reason.message.toLowerCase();
      // Suppress various reCAPTCHA and Firebase timeout-related errors
      if (message.includes('timeout') || 
          message.includes('recaptcha') || 
          message.includes('network error') ||
          message.includes('cancelled')) {
        event.preventDefault(); // Suppress the error overlay
      }
    }
  });
}

export default null; // No default export of app since it's lazily initialized