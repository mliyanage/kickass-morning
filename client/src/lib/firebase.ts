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
    console.log('[Firebase] Initializing Firebase SDK...');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return { app, auth };
};

export const getFirebaseAuth = () => {
  const { auth } = initializeFirebase();
  return auth;
};

// Initialize recaptcha verifier
export const initializeRecaptcha = (containerId: string): RecaptchaVerifier => {
  const firebaseAuth = getFirebaseAuth();
  return new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'normal',
    callback: () => {
      console.log('reCAPTCHA solved');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA expired');
    }
  });
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
    console.error('Error sending SMS:', error);
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
    console.error('Error verifying code:', error);
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
    console.error('Error getting Firebase token:', error);
    throw error;
  }
};

export default null; // No default export of app since it's lazily initialized