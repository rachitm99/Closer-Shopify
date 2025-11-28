import { useCallback } from 'react';

// Declare the global shopify object from CDN
declare global {
  interface Window {
    shopify?: {
      createApp: (config: { apiKey: string }) => any;
      idToken: () => Promise<string>;
    };
  }
}

/**
 * Helper function to add timeout to a promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Session token request timed out')), timeoutMs)
    ),
  ]);
}

/**
 * Creates an authenticated fetch function.
 * Uses App Bridge CDN's idToken() for session tokens
 */
export function useAuthenticatedFetch() {
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    console.log(`🚀 AuthFetch - Starting request to: ${url}`);
    const headers = new Headers(options.headers);
    
    // Try to get session token from App Bridge CDN
    if (typeof window !== 'undefined' && window.shopify?.idToken) {
      console.log('🔑 AuthFetch - Attempting to get ID token from App Bridge CDN...');
      try {
        // Add 5 second timeout to prevent hanging
        const token = await withTimeout(window.shopify.idToken(), 5000);
        if (token) {
          console.log('✅ AuthFetch - ID token obtained successfully from CDN');
          headers.set('Authorization', `Bearer ${token}`);
        } else {
          console.log('⚠️ AuthFetch - ID token was empty/null');
        }
      } catch (error) {
        console.log('❌ AuthFetch - Failed to get ID token:', error);
        console.log('🔄 AuthFetch - Will fall back to cookie-based auth');
      }
    } else {
      console.log('⚠️ AuthFetch - window.shopify.idToken not available, using cookie-based auth only');
    }
    
    console.log(`📡 AuthFetch - Making fetch request to: ${url}`);
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
    console.log(`📥 AuthFetch - Response received: ${response.status} ${response.statusText}`);
    
    return response;
  }, []);

  return fetchWithAuth;
}
