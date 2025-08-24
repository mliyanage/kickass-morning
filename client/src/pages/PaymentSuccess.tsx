import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Phone, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import AppLayout from '@/components/layouts/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface PaymentSessionData {
  paymentStatus: string;
  customerEmail: string;
  bundleType: string;
  credits: string;
  amountTotal: number;
}

export default function PaymentSuccess() {
  const [location, setLocation] = useLocation();
  const [sessionData, setSessionData] = useState<PaymentSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
      setError('Invalid payment session');
      setIsLoading(false);
      return;
    }

    const fetchSessionData = async () => {
      try {
        const data = await apiRequest('GET', `/api/stripe/session/${sessionId}`);
        setSessionData(data);
      } catch (error: any) {
        console.error('Error fetching payment session:', error);
        setError('Failed to verify payment');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, []);

  if (isLoading) {
    return (
      <ErrorBoundary>
        <AppLayout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Confirming your payment...</p>
            </div>
          </div>
        </AppLayout>
      </ErrorBoundary>
    );
  }

  if (error || !sessionData) {
    return (
      <ErrorBoundary>
        <AppLayout>
          <div className="min-h-screen flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="p-6 text-center">
                <div className="text-red-500 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                    ❌
                  </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">Payment Error</h2>
                <p className="text-gray-600 mb-4">{error || 'Something went wrong with your payment'}</p>
                <Button onClick={() => setLocation('/dashboard')} className="w-full">
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </AppLayout>
      </ErrorBoundary>
    );
  }

  const bundleNames = {
    '20_calls': '20 Wake-up Calls',
    '50_calls': '50 Wake-up Calls'
  };

  const bundleName = bundleNames[sessionData.bundleType as keyof typeof bundleNames] || sessionData.bundleType;

  return (
    <ErrorBoundary>
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="p-8 text-center">
              {/* Success Icon */}
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Payment Successful! 🎉
                </h1>
                <p className="text-gray-600">
                  You're all set! You now have <strong>{sessionData.credits} wake-up calls</strong> in your account.
                </p>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-center mb-3">
                  <Phone className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="font-medium">Purchase Details</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bundle:</span>
                    <span className="font-medium">{bundleName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Credits:</span>
                    <span className="font-medium">{sessionData.credits} calls</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">${(sessionData.amountTotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium">Paid</span>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Your credits have been added to your account. You can now create more schedules or modify existing ones.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => setLocation('/dashboard')}
                    className="flex-1"
                  >
                    View Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation('/schedule-call')}
                    className="flex-1"
                  >
                    Create Schedule
                  </Button>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Receipt sent to {sessionData.customerEmail}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ErrorBoundary>
  );
}