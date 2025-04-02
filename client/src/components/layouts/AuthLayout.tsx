import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Footer from '@/components/Footer';
import { Link } from 'wouter';
import { Clock } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white py-4 shadow-sm">
        <div className="container mx-auto px-4">
          <Link href="/" className="flex items-center">
            <Clock className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold text-primary-700">KickAss Morning</span>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
              {subtitle && <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>}
            </div>
            {children}
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
}

export default AuthLayout;
