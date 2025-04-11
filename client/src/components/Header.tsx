import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Header() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      // Force reload to clear any state and properly redirect
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

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center cursor-pointer" onClick={() => setLocation("/dashboard")}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="ml-2 text-xl font-bold text-primary-700">KickAss Morning</span>
              </div>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8" aria-label="Main navigation">
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
                  setLocation("/help");
                }}
              >
                Help
              </a>
            </nav>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <button type="button" className="rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="relative">
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
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            {/* Mobile menu button */}
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
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <a 
              href="#" 
              className="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
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
              className="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
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
              className="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
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
              className="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              onClick={(e) => {
                e.preventDefault();
                setLocation("/help");
                setIsMobileMenuOpen(false);
              }}
            >
              Help
            </a>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="mt-3 space-y-1">
              <Button 
                variant="ghost" 
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start"
                disabled={logoutMutation.isPending}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
