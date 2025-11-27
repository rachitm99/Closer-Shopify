// Use require for optional dependency to avoid TypeScript errors when not installed yet
// and avoid strongly typed `App` to keep this lightweight; callers can pass any AppBridge instance.
// Attempt to require '@shopify/app-bridge-utils' (it is optional / may be deprecated).
let getSessionToken: any = null;
// Try a dynamic import. If the package is present it will be loaded, otherwise skip.
try {
  import('@shopify/app-bridge-utils').then((utils) => {
    getSessionToken = utils.getSessionToken;
  }).catch(() => {
    console.warn('@shopify/app-bridge-utils not available, falling back to cookies for authentication');
  });
} catch (err) {
  // In rare environments dynamic import may throw synchronously
  console.warn('@shopify/app-bridge-utils dynamic import failed, falling back to cookies');
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
