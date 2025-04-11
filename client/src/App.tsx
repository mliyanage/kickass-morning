import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import PhoneVerification from "@/pages/PhoneVerification";
import OtpVerification from "@/pages/OtpVerification";
import Personalization from "@/pages/Personalization";
import ScheduleCall from "@/pages/ScheduleCall";
import Dashboard from "@/pages/Dashboard";
import Help from "@/pages/Help";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  useEffect(() => {
    // Setup a storage event listener to handle auth state changes from other tabs/components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kickassmorning_user' && e.newValue) {
        try {
          const userData = JSON.parse(e.newValue);
          setIsAuthenticated(true);
          setIsPhoneVerified(userData.phoneVerified || false);
          setIsPersonalized(userData.isPersonalized || false);
          setIsLoading(false);
          console.log("Auth state updated from storage event");
        } catch (error) {
          console.error("Error parsing user data from storage:", error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check if there's already user data in localStorage on mount
    const storedUser = localStorage.getItem('kickassmorning_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setIsPhoneVerified(userData.phoneVerified || false);
        setIsPersonalized(userData.isPersonalized || false);
        setIsLoading(false);
        console.log("User found in localStorage on app start");
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem('kickassmorning_user');
      }
    }
    
    // Check if user is authenticated via API
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check', {
          credentials: 'include'
        });
        const data = await res.json();
        
        if (data.authenticated) {
          setIsAuthenticated(true);
          setIsPhoneVerified(data.user.phoneVerified || false);
          setIsPersonalized(data.user.isPersonalized || false);
          setIsLoading(false);
          
          // Store user data in localStorage for future quick access
          localStorage.setItem('kickassmorning_user', JSON.stringify(data.user));
          
          console.log("Auth check successful:", {
            isAuthenticated: true,
            isPhoneVerified: data.user.phoneVerified,
            isPersonalized: data.user.isPersonalized
          });
        } else {
          console.log("Not authenticated:", data.message);
          setIsAuthenticated(false);
          setIsLoading(false);
          localStorage.removeItem('kickassmorning_user');
          
          // If we're trying to access a page that requires auth, redirect to login
          const currentPath = window.location.pathname;
          if (
            currentPath !== '/' && 
            currentPath !== '/login' && 
            currentPath !== '/signup'
          ) {
            setLocation('/login');
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
        setIsLoading(false);
        localStorage.removeItem('kickassmorning_user');
      }
    };

    checkAuth();
    
    // Set up interval to periodically check authentication status
    const authCheckInterval = setInterval(checkAuth, 10000); // Check auth every 10 seconds
    
    return () => {
      clearInterval(authCheckInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setLocation]);

  // Authentication guard for protected routes
  const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
      if (!isAuthenticated && !isLoading) {
        // Use React Router navigation instead of full page reload
        setLocation("/login");
      }
    }, [isAuthenticated, isLoading]);

    // Show a loading state while checking authentication
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      );
    }

    return isAuthenticated ? <>{children}</> : null;
  };

  // Phone verification guard
  const PhoneVerifiedGuard = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
      if (!isPhoneVerified && isAuthenticated) {
        setLocation("/phone-verification");
      }
    }, [isPhoneVerified, isAuthenticated]);

    return isAuthenticated && isPhoneVerified ? <>{children}</> : null;
  };

  // Personalization guard
  const PersonalizedGuard = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
      if (!isPersonalized && isAuthenticated) {
        setLocation("/personalization");
      }
    }, [isPersonalized, isAuthenticated]);

    return isAuthenticated && isPersonalized ? <>{children}</> : null;
  };

  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login">
          {isAuthenticated ? (
            <Dashboard />
          ) : (
            <Login />
          )}
        </Route>
        <Route path="/signup" component={Signup} />
        <Route path="/phone-verification">
          <AuthGuard>
            <PhoneVerification />
          </AuthGuard>
        </Route>
        <Route path="/otp-verification">
          <AuthGuard>
            <OtpVerification />
          </AuthGuard>
        </Route>
        <Route path="/personalization">
          <AuthGuard>
            <Personalization />
          </AuthGuard>
        </Route>
        <Route path="/schedule-call">
          <PersonalizedGuard>
            <ScheduleCall />
          </PersonalizedGuard>
        </Route>
        <Route path="/dashboard">
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        </Route>
        <Route path="/help">
          <AuthGuard>
            <Help />
          </AuthGuard>
        </Route>
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
