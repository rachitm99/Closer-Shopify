declare module '@shopify/app-bridge-utils' {
  import type { App } from '@shopify/app-bridge';
  export function getSessionToken(app: App): Promise<string>;
  // Optional helper - may not exist in all versions; if present, it's a function
  export const generateSessionToken: ((...args: any[]) => Promise<string>) | undefined;
}
