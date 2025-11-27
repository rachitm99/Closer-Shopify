import { useCallback, useContext } from 'react';
import { Context as AppBridgeContext } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge/utilities';

/**
 * Creates an authenticated fetch function.
 * Uses App Bridge getSessionToken utility for v3.x
 */
export function useAuthenticatedFetch() {
  // Get app from context - will be undefined if not in provider
  const app = useContext(AppBridgeContext);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);
    
    // Try to get session token from App Bridge
    if (app) {
      try {
        const token = await getSessionToken(app);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } catch (error) {
        console.log('Could not get session token:', error);
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
