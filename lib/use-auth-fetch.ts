import { useCallback, useContext } from 'react';
import { Context as AppBridgeContext } from '@shopify/app-bridge-react';

/**
 * Creates an authenticated fetch function.
 * Tries to get session token from App Bridge, falls back to cookie auth.
 */
export function useAuthenticatedFetch() {
  // Get app from context - will be undefined if not in provider
  const app = useContext(AppBridgeContext);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);
    
    // Try to get session token from App Bridge
    try {
      if (app) {
        // Try idToken (newer) or getSessionToken (older)
        let token: string | undefined;
        if (typeof (app as any).idToken === 'function') {
          token = await (app as any).idToken();
        } else if (typeof (app as any).getSessionToken === 'function') {
          token = await (app as any).getSessionToken();
        }
        
        if (token && token !== 'undefined') {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
    } catch (error) {
      console.log('Could not get session token, using cookie auth');
    }
    
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  }, [app]);

  return fetchWithAuth;
}
