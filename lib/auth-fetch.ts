/**
 * Creates an authenticated fetch function that uses App Bridge session tokens.
 * This is required for Shopify's embedded app authentication.
 */
export function createAuthenticatedFetch(app: any) {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
      // Get session token from App Bridge (idToken method for newer App Bridge)
      let token: string | undefined;
      
      if (typeof app?.idToken === 'function') {
        token = await app.idToken();
      } else if (typeof app?.getSessionToken === 'function') {
        token = await app.getSessionToken();
      }
      
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${token}`);
      
      return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error getting session token:', error);
      // Fallback to regular fetch with credentials
      return fetch(url, {
        ...options,
        credentials: 'include',
      });
    }
  };
}
