import { ReactNode } from 'react';
import { useLocation, Link } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  Home, 
  Clock, 
  Settings, 
  ClipboardList, 
  User, 
  HelpCircle 
} from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();

  const navItems: NavItem[] = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Clock, label: 'Schedule Call', href: '/schedule-call' },
    { icon: Settings, label: 'Preferences', href: '/personalize' },
    { icon: ClipboardList, label: 'Call History', href: '/call-history' },
    { icon: User, label: 'Account', href: '/account' },
    { icon: HelpCircle, label: 'Help', href: '/help' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
          {/* Sidebar */}
          <aside className="py-6 px-2 sm:px-6 lg:col-span-3 lg:py-0 lg:px-0">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <a 
                      className={`
                        group rounded-md px-3 py-2 flex items-center text-sm font-medium
                        ${isActive 
                          ? 'bg-neutral-50 text-primary-600' 
                          : 'text-neutral-700 hover:text-primary-600 hover:bg-neutral-50'}
                      `}
                    >
                      <item.icon 
                        className={`
                          mr-3 flex-shrink-0 h-6 w-6
                          ${isActive 
                            ? 'text-primary-500' 
                            : 'text-neutral-400 group-hover:text-primary-500'}
                        `} 
                      />
                      {item.label}
                    </a>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
            {children}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

export default DashboardLayout;
