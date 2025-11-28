import { useCallback } from 'react';

/**
 * Helper function to add timeout to a promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
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
      console.log('🔑 AuthFetch - Shopify object available');
      
      try {
        // Wait for Shopify App Bridge to be fully ready
        if (typeof shopify.ready === 'function') {
          console.log('🔑 AuthFetch - Waiting for shopify.ready()...');
          await withTimeout(shopify.ready(), 5000);
          console.log('✅ AuthFetch - Shopify is ready');
        }
        
        // Now get the ID token
        if (typeof shopify.idToken === 'function') {
          console.log('🔑 AuthFetch - Calling shopify.idToken()...');
          const token = await withTimeout(shopify.idToken(), 5000);
          if (token) {
            console.log('✅ AuthFetch - ID token obtained successfully');
            headers.set('Authorization', `Bearer ${token}`);
          } else {
            console.log('⚠️ AuthFetch - No token obtained');
          }
        }
      } catch (error) {
        console.log('❌ AuthFetch - Failed to get ID token:', error);
        console.log('🔄 AuthFetch - Will fall back to cookie-based auth');
      }
    } else {
      console.log('⚠️ AuthFetch - Not in Shopify admin (window.shopify not available)');
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
