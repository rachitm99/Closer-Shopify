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
      console.log('🔑 AuthFetch - Shopify object available');
      console.log('🔑 AuthFetch - idToken type:', typeof shopify.idToken);
      console.log('🔑 AuthFetch - idToken value:', shopify.idToken);
      
      try {
        let token: string | null = null;
        
        // Try different ways to get the token
        if (typeof shopify.idToken === 'function') {
          console.log('🔑 AuthFetch - Calling shopify.idToken() as function...');
          token = await withTimeout(shopify.idToken(), 5000);
        } else if (shopify.idToken && typeof shopify.idToken.fetch === 'function') {
          console.log('🔑 AuthFetch - Calling shopify.idToken.fetch()...');
          token = await withTimeout(shopify.idToken.fetch(), 5000);
        } else if (shopify.idToken && typeof shopify.idToken.get === 'function') {
          console.log('🔑 AuthFetch - Calling shopify.idToken.get()...');
          token = await withTimeout(shopify.idToken.get(), 5000);
        }
        
        if (token) {
          console.log('✅ AuthFetch - ID token obtained successfully');
          headers.set('Authorization', `Bearer ${token}`);
        } else {
          console.log('⚠️ AuthFetch - No token obtained, using cookie-based auth');
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
