import AppLayout from "@/components/layouts/AppLayout";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsConditions() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none">
                <h1 className="text-4xl font-bold text-center mb-8">Terms & Conditions</h1>
                <p className="text-sm text-gray-600 text-center mb-8">Last updated: August 2025</p>
                
                <p className="mb-6">
                  Welcome to Kickass Morning ("we," "our," "us").
                  By using our service, you agree to these Terms & Conditions. Please read them carefully.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Service Description</h2>
                <p className="mb-4">
                  Kickass Morning provides AI-generated voice calls to help you wake up at your chosen time. 
                  Calls are made to the phone number you provide, and one-time passcodes (OTPs) are sent to 
                  your email address to verify your account.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. AI Voice Disclaimer</h2>
                <ul className="list-disc pl-6 mb-4">
                  <li>All calls use AI-generated voices created using Eleven Labs technology.</li>
                  <li>No real human voices are used in the calls.</li>
                  <li>These calls are for personal motivation and entertainment purposes only.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Your Responsibilities</h2>
                <ul className="list-disc pl-6 mb-4">
                  <li>You are responsible for providing accurate contact details.</li>
                  <li>You must have permission to receive calls at the phone number you provide.</li>
                  <li>You must not use our service for illegal, abusive, or harmful purposes.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Service Availability</h2>
                <ul className="list-disc pl-6 mb-4">
                  <li>We aim to provide the service reliably, but we do not guarantee uninterrupted or error-free delivery.</li>
                  <li>We are not responsible for any missed calls or failures caused by factors outside our control (e.g., network issues, device settings).</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Limitation of Liability</h2>
                <p className="mb-4">To the fullest extent permitted by law:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>We are not liable for any indirect, incidental, or consequential damages arising from the use of our service.</li>
                  <li>Your use of Kickass Morning is at your own risk.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">6. Changes to the Service or Terms</h2>
                <p className="mb-4">
                  We may update these Terms or the service at any time. Updates will be posted on this page, 
                  and continued use means you accept the changes.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">7. Governing Law</h2>
                <p className="mb-4">
                  These Terms are governed by the laws of New South Wales, Australia, and any disputes 
                  will be handled in NSW courts.
                </p>

                <div className="mt-12 p-6 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 text-center">
                    If you have questions about these Terms, please contact us at support@kickassmorning.com
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}