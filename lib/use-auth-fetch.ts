import { useCallback, useContext } from 'react';
import { Context as AppBridgeContext } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge/utilities';

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
 * Primarily uses App Bridge CDN (window.shopify), falls back to npm package
 */
export function useAuthenticatedFetch() {
  // Get app from context for fallback
  const app = useContext(AppBridgeContext);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);
    let tokenObtained = false;
    
    // PRIMARY: Try to get token from App Bridge CDN (window.shopify)
    const shopify = typeof window !== 'undefined' ? (window as any).shopify : null;
    if (shopify && typeof shopify.idToken === 'function') {
      try {
        const token = await withTimeout(shopify.idToken(), 3000);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
          tokenObtained = true;
        }
      } catch (error) {
        // CDN method failed, will try npm fallback
      }
    }
    
    // FALLBACK: Try npm package if CDN didn't work
    if (!tokenObtained && app) {
      try {
        const token = await withTimeout(getSessionToken(app), 3000);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
          tokenObtained = true;
        }
      } catch (error) {
        // npm method also failed
      }
    }
    
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  }, [app]);

  return fetchWithAuth;
}
