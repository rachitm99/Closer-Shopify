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
    console.log('🚀 useAuthenticatedFetch - Starting fetch for:', url);
    
    const headers = new Headers(options.headers);
    let tokenObtained = false;
    
    // PRIMARY: Try to get token from App Bridge CDN (window.shopify)
    console.log('🔍 useAuthenticatedFetch - Checking for window.shopify...');
    const shopify = typeof window !== 'undefined' ? (window as any).shopify : null;
    console.log('🔍 useAuthenticatedFetch - window.shopify exists:', !!shopify);
    console.log('🔍 useAuthenticatedFetch - window.shopify.idToken exists:', !!shopify?.idToken);
    console.log('🔍 useAuthenticatedFetch - window.shopify type:', typeof shopify);
    if (shopify) {
      console.log('🔍 useAuthenticatedFetch - window.shopify keys:', Object.keys(shopify));
    }
    
    if (shopify && typeof shopify.idToken === 'function') {
      console.log('🎯 useAuthenticatedFetch - Attempting CDN idToken()...');
      try {
        const token = await withTimeout(shopify.idToken(), 3000);
        const tokenStr = token as string;
        console.log('✅ useAuthenticatedFetch - CDN token received, length:', tokenStr?.length || 0);
        if (tokenStr) {
          headers.set('Authorization', `Bearer ${tokenStr}`);
          tokenObtained = true;
          console.log('✅ useAuthenticatedFetch - Token set from CDN!');
        }
      } catch (error) {
        console.log('❌ useAuthenticatedFetch - CDN idToken() failed:', error);
      }
    } else {
      console.log('⚠️ useAuthenticatedFetch - CDN not available or idToken not a function');
    }
    
    // FALLBACK: Try npm package if CDN didn't work
    if (!tokenObtained) {
      console.log('🔄 useAuthenticatedFetch - Trying npm fallback...');
      console.log('🔄 useAuthenticatedFetch - App Bridge context exists:', !!app);
      
      if (app) {
        console.log('🎯 useAuthenticatedFetch - Attempting npm getSessionToken()...');
        try {
          const token = await withTimeout(getSessionToken(app), 3000);
          console.log('✅ useAuthenticatedFetch - npm token received, length:', token?.length || 0);
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
            tokenObtained = true;
            console.log('✅ useAuthenticatedFetch - Token set from npm package!');
          }
        } catch (error) {
          console.log('❌ useAuthenticatedFetch - npm getSessionToken() failed:', error);
        }
      } else {
        console.log('⚠️ useAuthenticatedFetch - No App Bridge context available');
      }
    }
    
    console.log('📊 useAuthenticatedFetch - Final status:');
    console.log('   - Token obtained:', tokenObtained);
    console.log('   - Authorization header set:', headers.has('Authorization'));
    console.log('   - Making request to:', url);
    
    if (!tokenObtained) {
      console.log('⚠️ useAuthenticatedFetch - NO TOKEN! Request will rely on cookies only');
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
    
    console.log('📥 useAuthenticatedFetch - Response status:', response.status);
    
    return response;
  }, [app]);

  return fetchWithAuth;
}
