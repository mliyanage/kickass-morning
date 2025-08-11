import { apiRequest } from "./queryClient";

// This is a client-side utility for Twilio integration
// In a real implementation, Twilio API calls would be made from the server

export async function requestPhoneVerification(phoneNumber: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest('POST', '/api/verify/phone', { phoneNumber });
    return { success: true, message: 'Verification code sent successfully' };
  } catch (error) {
    return { success: false, message: 'Failed to send verification code' };
  }
}

export async function verifyPhoneCode(code: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest('POST', '/api/verify/code', { code });
    return { success: true, message: 'Phone verified successfully' };
  } catch (error) {
    console.error('Error verifying phone code:', error);
    return { success: false, message: 'Invalid or expired verification code' };
  }
}

export async function requestSampleCall(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest('POST', '/api/sample-call', {});
    return { success: true, message: 'Sample call requested successfully' };
  } catch (error) {
    return { success: false, message: 'Failed to request sample call' };
  }
}

export const timezoneOptions = [
  { id: 'america/new_york', label: 'Eastern Time (ET)' },
  { id: 'america/los_angeles', label: 'Pacific Time (PT)' },
  { id: 'america/chicago', label: 'Central Time (CT)' },
  { id: 'america/denver', label: 'Mountain Time (MT)' },
  { id: 'america/anchorage', label: 'Alaska Time (AKT)' },
  { id: 'pacific/honolulu', label: 'Hawaii-Aleutian Time (HAT)' }
];
