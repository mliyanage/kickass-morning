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
    const confirmationResult = await signInWithPhoneNumber(firebaseAuth, phoneNumber, recaptchaVerifier);
    return confirmationResult;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

// Verify SMS code
export const verifyCode = async (confirmationResult: any, code: string) => {
  try {
    const result = await confirmationResult.confirm(code);
    return result;
  } catch (error) {
    console.error('Error verifying code:', error);
    throw error;
  }
};

// Get Firebase ID token for backend verification
export const getFirebaseToken = async (): Promise<string | null> => {
  const firebaseAuth = getFirebaseAuth();
  const currentUser = firebaseAuth.currentUser;
  if (currentUser) {
    return await currentUser.getIdToken();
  }
  return null;
};

export default null; // No default export of app since it's lazily initialized