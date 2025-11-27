// Use require for optional dependency to avoid TypeScript errors when not installed yet
// and avoid strongly typed `App` to keep this lightweight; callers can pass any AppBridge instance.
// Attempt to require '@shopify/app-bridge-utils' (it is optional / may be deprecated).
let getSessionToken: any = null;
try {
  // Use eval('require') to avoid bundler static analysis. This prevents the build
  // from attempting to resolve '@shopify/app-bridge-utils' when it isn't installed.
  const req: any = eval('require');
  const utils = req('@shopify/app-bridge-utils');
  getSessionToken = utils?.getSessionToken;
} catch (err) {
  // Not available or failed to import — continue without tokens (cookie fallback)
  // We intentionally only warn, to avoid noisy failures during builds where
  // the optional module may be absent.
  if (typeof window === 'undefined') {
    // Server-side warn for admins to check environment if they expect tokens
    console.warn('@shopify/app-bridge-utils not available; admin session token fetching disabled.');
  }
}
type AppLike = any;

export function createAuthenticatedFetch(app?: AppLike) {
  return async (input: RequestInfo, init?: RequestInit) => {
    // If the App Bridge instance is provided, fetch a session token
    if (app && getSessionToken) {
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
