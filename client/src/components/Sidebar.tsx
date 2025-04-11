import { useLocation } from "wouter";

export default function Sidebar() {
  const [location, setLocation] = useLocation();

  // Helper to determine if a path is active
  const isActive = (path: string) => location === path;

  return (
    <aside className="py-6 px-2 sm:px-6 lg:col-span-3 lg:py-0 lg:px-0">
      <nav className="space-y-1">
        {/* Dashboard */}
        <a
          href="#"
          className={`${isActive("/dashboard") ? "bg-gray-50 text-primary" : "text-gray-700 hover:text-primary hover:bg-gray-50"} group rounded-md px-3 py-2 flex items-center text-sm font-medium`}
          onClick={(e) => {
            e.preventDefault();
            setLocation("/dashboard");
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`${isActive("/dashboard") ? "text-primary" : "text-gray-400 group-hover:text-primary"} mr-3 flex-shrink-0 h-6 w-6`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Dashboard
        </a>

        {/* Preferences */}
        <a
          href="#"
          className={`${isActive("/personalization") ? "bg-gray-50 text-primary" : "text-gray-700 hover:text-primary hover:bg-gray-50"} group rounded-md px-3 py-2 flex items-center text-sm font-medium`}
          onClick={(e) => {
            e.preventDefault();
            setLocation("/personalization");
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`${isActive("/personalization") ? "text-primary" : "text-gray-400 group-hover:text-primary"} mr-3 flex-shrink-0 h-6 w-6`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Preferences
        </a>

        {/* Schedule Call */}
        <a
          href="#"
          className={`${isActive("/schedule-call") ? "bg-gray-50 text-primary" : "text-gray-700 hover:text-primary hover:bg-gray-50"} group rounded-md px-3 py-2 flex items-center text-sm font-medium`}
          onClick={(e) => {
            e.preventDefault();
            setLocation("/schedule-call");
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`${isActive("/schedule-call") ? "text-primary" : "text-gray-400 group-hover:text-primary"} mr-3 flex-shrink-0 h-6 w-6`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Schedule Call
        </a>

        {/* Call History */}
        <a
          href="#"
          className="text-gray-700 hover:text-primary hover:bg-gray-50 group rounded-md px-3 py-2 flex items-center text-sm font-medium"
          onClick={(e) => {
            e.preventDefault();
            // This would link to a call history page if implemented
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          Call History
        </a>

        {/* Account */}
        <a
          href="#"
          className="text-gray-700 hover:text-primary hover:bg-gray-50 group rounded-md px-3 py-2 flex items-center text-sm font-medium"
          onClick={(e) => {
            e.preventDefault();
            // This would link to an account page if implemented
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="text-gray-400 group-hover:text-primary mr-3 flex-shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Account
        </a>

        {/* Help */}
        <a
          href="#"
          className={`${isActive("/help") ? "bg-gray-50 text-primary" : "text-gray-700 hover:text-primary hover:bg-gray-50"} group rounded-md px-3 py-2 flex items-center text-sm font-medium`}
          onClick={(e) => {
            e.preventDefault();
            setLocation("/help");
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`${isActive("/help") ? "text-primary" : "text-gray-400 group-hover:text-primary"} mr-3 flex-shrink-0 h-6 w-6`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Help
        </a>
      </nav>
    </aside>
  );
}
