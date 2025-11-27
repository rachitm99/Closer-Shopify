declare module '@shopify/app-bridge-utils' {
  import type { App } from '@shopify/app-bridge';
  export function getSessionToken(app: App): Promise<string>;
  export function generateSessionToken?(): Promise<string>;
}
