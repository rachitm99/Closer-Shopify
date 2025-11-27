// Use require for optional dependency to avoid TypeScript errors when not installed yet
// and avoid strongly typed `App` to keep this lightweight; callers can pass any AppBridge instance.
// @ts-ignore - optional dependency, some environments may not have this module installed yet
const { getSessionToken } = require('@shopify/app-bridge-utils');
type AppLike = any;

export function createAuthenticatedFetch(app?: AppLike) {
  return async (input: RequestInfo, init?: RequestInit) => {
    // If the App Bridge instance is provided, fetch a session token
    if (app) {
      try {
        const token = await getSessionToken(app as any);
        init = init || {};
        init.headers = {
          ...(init.headers || {}),
          Authorization: `Bearer ${token}`,
        } as any;
      } catch (err) {
        // Fall back to unauthenticated fetch
        console.error('Failed to obtain session token from App Bridge:', err);
      }
    }

    return fetch(input, init);
  };
}
