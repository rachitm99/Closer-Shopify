import { useCallback } from 'react';

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
 * Uses App Bridge CDN's idToken() for session tokens when available
 */
export function useAuthenticatedFetch() {
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    console.log(`🚀 AuthFetch - Starting request to: ${url}`);
    const headers = new Headers(options.headers);
    
    // Check if we're in Shopify admin (App Bridge CDN available)
    const shopify = typeof window !== 'undefined' ? (window as any).shopify : null;
    
    if (shopify) {
      console.log('🔑 AuthFetch - Shopify object available:', Object.keys(shopify));
      
      // Try idToken() method (App Bridge CDN)
      if (typeof shopify.idToken === 'function') {
        console.log('🔑 AuthFetch - Attempting to get ID token from App Bridge CDN...');
        try {
          const token = await withTimeout(shopify.idToken(), 5000);
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
        console.log('⚠️ AuthFetch - shopify.idToken is not a function');
        console.log('⚠️ AuthFetch - Available methods:', shopify);
      }
    } else {
      console.log('⚠️ AuthFetch - Not in Shopify admin (window.shopify not available)');
      console.log('⚠️ AuthFetch - Using cookie-based auth only');
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
