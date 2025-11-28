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
 * Uses App Bridge npm package for session tokens (CDN script is also loaded for compliance)
 */
export function useAuthenticatedFetch() {
  // Get app from context - will be undefined if not in provider
  const app = useContext(AppBridgeContext);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);
    
    // Try to get session token from App Bridge npm package
    if (app) {
      try {
        // Add 5 second timeout to prevent hanging
        const token = await withTimeout(getSessionToken(app), 5000);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } catch (error) {
        console.log('Could not get session token, using cookie-based auth');
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
