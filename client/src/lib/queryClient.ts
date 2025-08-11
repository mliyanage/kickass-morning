import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Removed throwIfResNotOk function to prevent double body reading issues

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle all error status codes in one place to avoid double body reading
  if (!res.ok) {
    try {
      const errorData = await res.json();
      console.log('[apiRequest] Error response data:', errorData);
      const error = new Error(errorData.message || `Request failed with status ${res.status}`);
      (error as any).status = res.status;
      (error as any).personalizationRequired = errorData.personalizationRequired;
      (error as any).requiresAuth = errorData.requiresAuth;
      console.log('[apiRequest] Created error object:', error);
      throw error;
    } catch (jsonError) {
      console.log('[apiRequest] JSON parsing failed:', jsonError);
      // If JSON parsing fails, use status-based error messages
      const error = new Error(`Request failed with status ${res.status}`);
      (error as any).status = res.status;
      throw error;
    }
  }
  
  // Parse and return JSON for successful responses
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // Handle errors without double body reading
    if (!res.ok) {
      try {
        const errorData = await res.json();
        throw new Error(errorData.message || `Request failed with status ${res.status}`);
      } catch (jsonError) {
        // If JSON parsing fails, use status-based error messages
        switch (res.status) {
          case 401:
            throw new Error("Authentication required. Please log in again.");
          case 403:
            throw new Error("Access denied");
          case 404:
            throw new Error("Resource not found");
          case 500:
            throw new Error("Server error. Please try again later");
          default:
            throw new Error(`Request failed with status ${res.status}`);
        }
      }
    }

    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
