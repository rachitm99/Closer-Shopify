import { useMemo } from 'react';

/**
 * Creates an authenticated fetch function.
 * Works both with and without App Bridge context.
 */
export function useAuthenticatedFetch() {
  return useMemo(() => {
    return async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);
      
      // Try to get session token from global shopify app bridge if available
      try {
        if (typeof window !== 'undefined' && (window as any).shopify?.idToken) {
          const token = await (window as any).shopify.idToken();
          if (token && token !== 'undefined') {
            headers.set('Authorization', `Bearer ${token}`);
          }
        }
      } catch (error) {
        // Continue without token - will fall back to cookie auth
        console.log('Session token not available, using cookie auth');
      }
      
      return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    };
  }, []);
}
