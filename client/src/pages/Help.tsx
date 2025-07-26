import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PublicLayout from "@/components/layouts/PublicLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Check, Clock, List, Phone, Settings, Speaker, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Help() {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check", {
          credentials: "include",
        });
        const data = await res.json();
        setIsAuthenticated(data.authenticated || false);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    // If coming from a dashboard route, we're likely authenticated
    // Use this to provide a smoother transition
    if (document.referrer && (document.referrer.includes('/dashboard') || document.referrer.includes('/personalization') || document.referrer.includes('/schedule-call') || document.referrer.includes('/call-history') || document.referrer.includes('/account'))) {
      setIsAuthenticated(true);
      checkAuth(); // Still check, but don't wait for it
    } else {
      checkAuth();
    }
  }, []);

  const helpContent = (
    <div className="space-y-6">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-white drop-shadow-lg mb-4">
          How It Works
        </h1>
        <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed drop-shadow">
          Learn how KickAss Morning can transform your mornings
        </p>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-lg p-8 shadow-lg border border-white/20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">KickAss Morning: Getting Started Guide</h2>
        <p className="text-md text-gray-600 mb-6">
          Welcome to KickAss Morning! This guide will walk you through using our AI-powered wake-up call service
          to help you start your day motivated and energized.
        </p>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>User Journey Overview</CardTitle>
              <CardDescription>
                Follow these steps to get started with your personalized wake-up calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="rounded-lg bg-primary-50 p-4 flex-1">
                    <div className="flex items-center mb-2">
                      <div className="bg-primary rounded-full p-2 mr-2">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">Step 1: Create Account</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Sign up using your email address with our passwordless authentication. You'll receive a verification code via email.
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary-50 p-4 flex-1">
                    <div className="flex items-center mb-2">
                      <div className="bg-primary rounded-full p-2 mr-2">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">Step 2: Verify Phone</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Add and verify your phone number to receive wake-up calls. We'll send a verification code via SMS.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="rounded-lg bg-primary-50 p-4 flex-1">
                    <div className="flex items-center mb-2">
                      <div className="bg-primary rounded-full p-2 mr-2">
                        <Settings className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">Step 3: Personalize</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Set your goals, challenges, and select a voice for your wake-up calls from our collection of AI-generated inspirational voices.
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary-50 p-4 flex-1">
                    <div className="flex items-center mb-2">
                      <div className="bg-primary rounded-full p-2 mr-2">
                        <Speaker className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">Step 4: Try a Sample</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Experience how our wake-up calls work by requesting a sample call to your verified phone number.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="rounded-lg bg-primary-50 p-4 flex-1">
                    <div className="flex items-center mb-2">
                      <div className="bg-primary rounded-full p-2 mr-2">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">Step 5: Schedule Calls</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Set up your recurring or one-time wake-up calls by choosing times, days, and additional options.
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary-50 p-4 flex-1">
                    <div className="flex items-center mb-2">
                      <div className="bg-primary rounded-full p-2 mr-2">
                        <List className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">Step 6: Manage Calls</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      View your call history, skip upcoming calls if needed, and adjust your schedule anytime.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Get answers to common questions about using KickAss Morning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How does the wake-up call service work?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">Our service uses AI-generated voices to deliver personalized motivational messages based on your goals and challenges. Here's the process:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>You set up your preferences (goals, challenges, preferred voice)</li>
                      <li>You schedule wake-up calls for specific times and days</li>
                      <li>At the scheduled time, our system calls your verified phone number</li>
                      <li>You answer the call and hear a personalized motivational message</li>
                      <li>The call is recorded in your history for reference</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>Why do I need to verify my phone number?</AccordionTrigger>
                  <AccordionContent>
                    <p>Phone verification is required to ensure that:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-2">
                      <li>We can deliver wake-up calls to the correct number</li>
                      <li>You've authorized our service to call your number</li>
                      <li>We prevent abuse of the service</li>
                    </ul>
                    <p>We use a one-time verification code sent via SMS to verify your phone number.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>What voice options are available?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-3">We offer several AI-generated voices powered by ElevenLabs technology, inspired by well-known motivational figures:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-3">
                      <li>Jocko Willink - For disciplined, no-excuses motivation</li>
                      <li>Similar voices inspired by other popular figures</li>
                      <li>Custom options - We're constantly adding new voices</li>
                    </ul>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 mb-1">Important Disclaimer:</p>
                      <p className="text-sm text-yellow-700">
                        These are AI-generated voices created using ElevenLabs technology that are designed to sound similar to public figures for motivational purposes. 
                        They are <strong>not</strong> the actual voices of these individuals. All voices are synthesized and used for inspirational content only.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>Can I customize my wake-up message?</AccordionTrigger>
                  <AccordionContent>
                    <p>Yes! Our AI system generates unique messages each time based on:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Your specified goals (exercise, productivity, study, etc.)</li>
                      <li>Your morning struggles (hitting snooze, lack of motivation, etc.)</li>
                      <li>The voice you've selected</li>
                    </ul>
                    <p className="mt-2">Each call provides a fresh, personalized message to keep you motivated.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger>What if I miss a call?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">If you miss a wake-up call:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>It will be marked as "missed" in your call history</li>
                      <li>If you've enabled call retry, we'll attempt to call again after a short delay</li>
                      <li>You can always view your upcoming calls on the dashboard</li>
                      <li>You can skip tomorrow's call if needed using the dashboard controls</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger>How do I get started?</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                        </div>
                        <p>Create an account with your email address</p>
                      </div>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <ArrowRight className="h-5 w-5 text-primary mr-2" />
                        </div>
                        <p>Verify your phone number in the dashboard</p>
                      </div>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <ArrowRight className="h-5 w-5 text-primary mr-2" />
                        </div>
                        <p>Complete your personalization settings</p>
                      </div>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <ArrowRight className="h-5 w-5 text-primary mr-2" />
                        </div>
                        <p>Try a sample call to experience the service</p>
                      </div>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <ArrowRight className="h-5 w-5 text-primary mr-2" />
                        </div>
                        <p>Schedule your first wake-up call</p>
                      </div>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                        </div>
                        <p>Enjoy more productive and motivated mornings!</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
    </div>
  );

  // Default to PublicLayout while auth check is happening to prevent layout jumping
  if (isAuthenticated === true) {
    return <DashboardLayout>{helpContent}</DashboardLayout>;
  } else {
    return <PublicLayout>{helpContent}</PublicLayout>;
  }
}