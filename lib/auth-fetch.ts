/**
 * Creates an authenticated fetch function that uses App Bridge session tokens.
 * This is required for Shopify's embedded app authentication.
 */
export function createAuthenticatedFetch(app: any) {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);
    
    try {
      // Get session token from App Bridge (idToken method for newer App Bridge)
      let token: string | undefined;
      
      if (typeof app?.idToken === 'function') {
        token = await app.idToken();
      } else if (typeof app?.getSessionToken === 'function') {
        token = await app.getSessionToken();
      }
      
      // Only set Authorization header if we got a valid token
      if (token && token !== 'undefined') {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (error) {
      console.error('Error getting session token:', error);
      // Continue without token - will fall back to cookie auth
    }
    
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  };
}
