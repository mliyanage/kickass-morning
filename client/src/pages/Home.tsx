import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import Logo from "@/components/Logo";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm py-4 border-b border-white/20">
        <div className="main-container">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Logo size="md" />
            </div>
            <div className="flex space-x-4">
              <Button variant="ghost" onClick={() => setLocation("/help")}>
                How It Works
              </Button>
              <Button variant="outline" onClick={() => setLocation("/login")}>
                Log in
              </Button>
              <Button onClick={() => setLocation("/signup")}>
                Sign up
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl mb-6">
              <span className="block text-white drop-shadow-lg">Alarms Don't Work.</span>
              <span className="block text-white font-black drop-shadow-lg">This Does.</span>
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed drop-shadow">
              A wake-up call service designed for people who <em>just can't get out of bed.</em>
            </p>
          </div>

          {/* Problem Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-8 mb-12 shadow-lg border border-white/20">
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              We get it. You sleep 7–8 hours. You eat right. You even go to bed early. But when the alarm rings… it's just not enough.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Until someone calls. Suddenly you're up, alert, and moving.
            </p>
          </div>

          {/* Solution */}
          <div className="text-center mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-8 shadow-lg border border-white/20">
              <p className="text-xl text-gray-800 font-medium max-w-3xl mx-auto leading-relaxed">
                <strong>Kickass Wake-Up Calls</strong> recreates that moment—an actual call, tailored to <em>you</em>, 
                with a voice you choose and a message that hits the right note every time.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How It Helps:</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🕒</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Flexible Scheduling</h3>
                      <p className="text-gray-600">Set your wake-up times for any day of the week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🎙</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Motivating Voices</h3>
                      <p className="text-gray-600">Pick voices that motivate—from calm to commanding (yes, we have "Jocko")</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Personal Messages</h3>
                      <p className="text-gray-600">Tell us your story—why you want to wake up early—and get daily messages that match your goals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🛌</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Full Control</h3>
                      <p className="text-gray-600">Turn it off anytime if plans change</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">📈</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Track Progress</h3>
                      <p className="text-gray-600">View your call history and celebrate the wins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mission Statement */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-8 mb-12">
            <div className="text-center">
              <p className="text-lg text-gray-800 leading-relaxed mb-4">
                This isn't just about waking up. It's about starting your day with <em>intention</em>.
              </p>
              <p className="text-lg text-gray-800 leading-relaxed font-medium">
                Because when your morning works, everything else does too.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-xl text-gray-700 mb-8">
              💡 Start with your first call. It might just change your life.
            </p>
            <Button size="lg" className="text-lg px-8 py-4" onClick={() => setLocation("/signup")}>
              Try It Now – Free Wake-Up Call
            </Button>
          </div>
        </div>
      </main>

      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} KickAss Morning. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
