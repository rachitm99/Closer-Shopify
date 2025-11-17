export const APP_CONFIG = {
  name: 'Reward Message App',
  version: '1.0.0',
  isFree: true,
  rewardMessage: {
    title: '🎉 Congratulations!',
    message: 'You have won a reward!',
  },
  metafield: {
    namespace: 'reward_message_app',
    key: 'enabled',
  },
  proxy: {
    subpathPrefix: 'apps',
    subpath: 'reward-message',
  },
} as const;

export const SHOPIFY_CONFIG = {
  apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
  scopes: (process.env.SHOPIFY_SCOPES || 'read_orders').split(','),
} as const;

export const SESSION_CONFIG = {
  cookieName: 'shopify_app_session',
  maxAge: 60 * 60 * 24 * 7, // 1 week
} as const;
