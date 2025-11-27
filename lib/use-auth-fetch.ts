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
 * Uses App Bridge getSessionToken utility for v3.x
 */
export function useAuthenticatedFetch() {
  // Get app from context - will be undefined if not in provider
  const app = useContext(AppBridgeContext);
  
  console.log('🔐 useAuthenticatedFetch - App Bridge context:', app ? '✅ Available' : '❌ Not available');

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    console.log(`🚀 AuthFetch - Starting request to: ${url}`);
    const headers = new Headers(options.headers);
    
    // Try to get session token from App Bridge with a timeout
    if (app) {
      console.log('🔑 AuthFetch - Attempting to get session token from App Bridge...');
      try {
        // Add 5 second timeout to prevent hanging
        const token = await withTimeout(getSessionToken(app), 5000);
        if (token) {
          console.log('✅ AuthFetch - Session token obtained successfully');
          headers.set('Authorization', `Bearer ${token}`);
        } else {
          console.log('⚠️ AuthFetch - Session token was empty/null');
        }
      } catch (error) {
        console.log('❌ AuthFetch - Failed to get session token:', error);
        console.log('🔄 AuthFetch - Will fall back to cookie-based auth');
      }
    } else {
      console.log('⚠️ AuthFetch - No App Bridge context, using cookie-based auth only');
    }
    
    console.log(`📡 AuthFetch - Making fetch request to: ${url}`);
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
    console.log(`📥 AuthFetch - Response received: ${response.status} ${response.statusText}`);
    
    return response;
  }, [app]);

  return fetchWithAuth;
}
