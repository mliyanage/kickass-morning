import { ReactNode, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // This useEffect ensures consistent page height to prevent layout shifts
  useEffect(() => {
    // Set a minimum height for the page content to prevent content jumps
    const setMinHeight = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = 64; // Approximate header height
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.style.minHeight = `${windowHeight - headerHeight - 80}px`; // 80px for padding
      }
    };

    setMinHeight();
    window.addEventListener('resize', setMinHeight);
    
    return () => {
      window.removeEventListener('resize', setMinHeight);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="main-container py-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          {/* Sidebar - fixed width to prevent layout shifts */}
          <div className="lg:col-span-3 mb-6 lg:mb-0">
            <Sidebar />
          </div>
          
          {/* Main content - with minimum height to prevent layout shifts */}
          <div id="main-content" className="space-y-6 sm:px-6 lg:col-span-9 lg:px-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}