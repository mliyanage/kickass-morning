import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Try to parse response as JSON first to extract error message
    try {
      const errorData = await res.json();
      if (errorData.message) {
        // If the server returned a message, use it for the error
        throw new Error(errorData.message);
      }
    } catch (e) {
      // If parsing fails, fall back to text
      const text = await res.text() || res.statusText;
      
      // Create user-friendly error message based on status code
      switch (res.status) {
        case 400:
          throw new Error(`Invalid request: ${text}`);
        case 401:
          throw new Error(`Authentication required: ${text}`);
        case 403:
          throw new Error(`Access denied: ${text}`);
        case 404:
          throw new Error(`Not found: ${text}`);
        case 500:
          throw new Error(`Server error: Please try again later`);
        default:
          throw new Error(`${res.status}: ${text}`);
      }
    }
  }
}

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

  // Handle authentication errors specially
  if (res.status === 401) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Authentication required. Please log in again.");
  }
  
  // For other error status codes
  await throwIfResNotOk(res);
  
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

    await throwIfResNotOk(res);
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
