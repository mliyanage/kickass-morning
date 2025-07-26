import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import Sidebar from "@/components/Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Initialize with smart defaults to prevent layout jumping
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const referrer = document.referrer;
      
      // Only assume authenticated for strictly authenticated routes
      if (currentPath.startsWith('/dashboard') || currentPath === '/personalization' || 
          currentPath === '/schedule-call' || currentPath === '/call-history' || 
          currentPath === '/account') {
        return { isAuthenticated: true, isLoading: false };
      }
      
      // For Help page, be more aggressive about detecting authentication
      if (currentPath === '/help') {
        const hasSessionCookie = document.cookie.includes('connect.sid');
        // If there's any session cookie, assume authenticated
        // Also check referrer for authenticated pages
        if (hasSessionCookie || (referrer && 
            (referrer.includes('/dashboard') || referrer.includes('/personalization') || 
             referrer.includes('/schedule-call') || referrer.includes('/call-history') ||
             referrer.includes('/account')))) {
          return { isAuthenticated: true, isLoading: false };
        }
        // Otherwise start as unauthenticated but check quickly
        return { isAuthenticated: false, isLoading: true };
      }
      
      // For all public pages (home, login, signup, help from public), 
      // check if there's a session cookie but default to not authenticated
      const hasSessionCookie = document.cookie.includes('connect.sid');
      if (currentPath === '/' || currentPath === '/login' || currentPath === '/signup' ||
          (currentPath === '/help' && (!referrer || !referrer.includes('/dashboard')))) {
        return { 
          isAuthenticated: false, 
          isLoading: hasSessionCookie // Only show loading if there might be a session
        };
      }
    }
    return { isAuthenticated: false, isLoading: true };
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const currentPath = window.location.pathname;
    
    // Define strictly authenticated pages (where we never need to check auth if already authenticated)
    const isStrictlyAuthenticatedPage = currentPath.startsWith('/dashboard') || 
                                       currentPath === '/personalization' || 
                                       currentPath === '/schedule-call' || 
                                       currentPath === '/call-history' || 
                                       currentPath === '/account';
    
    // Skip auth check if we're on strictly authenticated pages and already authenticated
    if (isStrictlyAuthenticatedPage && authState.isAuthenticated) {
      return;
    }
    
    // For public pages, only check auth if we have a session cookie or need to verify
    const isPublicPage = currentPath === '/' || currentPath === '/login' || currentPath === '/signup';
    const isHelpPage = currentPath === '/help';
    const hasSessionCookie = document.cookie.includes('connect.sid');
    
    // Skip auth check for public page navigation when no session cookie exists
    if (isPublicPage && !hasSessionCookie && !authState.isAuthenticated) {
      // Already in correct state, no need to check
      return;
    }
    
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check", {
          credentials: "include",
        });
        const data = await res.json();
        setAuthState({
          isAuthenticated: data.authenticated || false,
          isLoading: false
        });
      } catch (error) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false
        });
      }
    };

    // Only check auth when necessary:
    // 1. Always check for Help page to get correct authentication state
    // 2. Public pages with session cookies (might be authenticated)
    // 3. When not authenticated but might need to be
    if (isHelpPage || 
        (hasSessionCookie && !authState.isAuthenticated) || 
        (!isPublicPage && !isStrictlyAuthenticatedPage && !isHelpPage)) {
      checkAuth();
    }
  }, [location]); // React to location changes

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      window.location.href = "/login";
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error.message || "An error occurred while logging out. Please try again.",
      });
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Show loading state only for public pages on initial load
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isPublicPage = currentPath === '/' || currentPath === '/login' || currentPath === '/signup';
  
  if (authState.isLoading && isPublicPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm py-4 border-b border-white/20 sticky top-0 z-50">
        <div className="main-container">
          <div className="flex justify-between items-center">
            <div className="flex items-center cursor-pointer" onClick={() => setLocation(authState.isAuthenticated ? "/dashboard" : "/")}>
              <Logo size="md" />
            </div>

            {/* Navigation based on auth state */}
            {authState.isAuthenticated ? (
              <>
                {/* Authenticated Navigation */}
                <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <a 
                    href="#" 
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation("/dashboard");
                    }}
                  >
                    Dashboard
                  </a>
                  <a 
                    href="#" 
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation("/personalization");
                    }}
                  >
                    Preferences
                  </a>
                  <a 
                    href="#" 
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation("/schedule-call");
                    }}
                  >
                    Schedule Call
                  </a>
                  <a 
                    href="#" 
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation("/account");
                    }}
                  >
                    Account
                  </a>
                  <a 
                    href="#" 
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation("/help");
                    }}
                  >
                    Help
                  </a>
                </nav>

                <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                  <button type="button" className="rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                  <Button 
                    variant="ghost" 
                    onClick={handleLogout} 
                    className="flex items-center"
                    disabled={logoutMutation.isPending}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
                  </Button>
                </div>

                {/* Mobile menu button for authenticated users */}
                <div className="-mr-2 flex items-center sm:hidden">
                  <button 
                    type="button" 
                    className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Public Navigation */}
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
              </>
            )}
          </div>

          {/* Mobile menu for authenticated users */}
          {authState.isAuthenticated && isMobileMenuOpen && (
            <div className="sm:hidden mt-4 pb-3 border-t border-gray-200">
              <div className="space-y-1">
                <a
                  href="#"
                  className="block px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/dashboard");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Dashboard
                </a>
                <a
                  href="#"
                  className="block px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/personalization");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Preferences
                </a>
                <a
                  href="#"
                  className="block px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/schedule-call");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Schedule Call
                </a>
                <a
                  href="#"
                  className="block px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/call-history");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Call History
                </a>
                <a
                  href="#"
                  className="block px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/account");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Account
                </a>
                <a
                  href="#"
                  className="block px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/help");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Help
                </a>
                <button
                  className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:text-red-700 hover:bg-gray-50"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {authState.isAuthenticated ? (
          // Dashboard Layout
          <div className="main-container py-10 pb-20 lg:pb-10">
            <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
              {/* Sidebar - hidden on mobile, shown as bottom toolbar */}
              <div className="lg:col-span-3 mb-6 lg:mb-0">
                <Sidebar />
              </div>
              
              {/* Main content */}
              <div className="space-y-6 sm:px-6 lg:col-span-9 lg:px-0">
                {children}
              </div>
            </div>
          </div>
        ) : (
          // Public Layout
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}