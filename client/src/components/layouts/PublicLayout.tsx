import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import Logo from "@/components/Logo";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm py-4 border-b border-white/20">
        <div className="main-container">
          <div className="flex justify-between items-center">
            <div className="flex items-center cursor-pointer" onClick={() => setLocation("/")}>
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
          {children}
        </div>
      </main>
    </div>
  );
}