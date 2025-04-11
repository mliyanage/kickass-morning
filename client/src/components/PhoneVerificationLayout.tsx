import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function PhoneVerificationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content */}
          <div className="space-y-6 sm:px-6 lg:col-span-9 lg:px-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}