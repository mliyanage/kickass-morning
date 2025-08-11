import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/layouts/AppLayout";

export default function FirebaseTest() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Check Firebase configuration
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    };
    setConfig(firebaseConfig);
  }, []);

  const testFirebaseLoad = async () => {
    try {
      // Dynamic import to test Firebase loading
      const { initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      
      const app = initializeApp(config);
      const auth = getAuth(app);
      
      console.log("Firebase initialized successfully:", auth);
      alert("Firebase loaded successfully! Check console for details.");
    } catch (error) {
      console.error("Firebase error:", error);
      alert("Firebase error: " + error);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Firebase Configuration Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Environment Variables:</h3>
              <div className="text-sm space-y-1">
                <div>API Key: {config?.apiKey ? "✅ Set" : "❌ Missing"}</div>
                <div>Auth Domain: {config?.authDomain ? "✅ Set" : "❌ Missing"}</div>
                <div>Project ID: {config?.projectId ? "✅ Set" : "❌ Missing"}</div>
              </div>
            </div>
            
            <Button onClick={testFirebaseLoad} className="w-full">
              Test Firebase Loading
            </Button>
            
            <div className="text-sm text-gray-600">
              <p>This page tests Firebase configuration and loading.</p>
              <p>Navigate to: <code>/firebase-test</code></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}