import { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { storeSession } from '../../../lib/session-storage';
import { setSessionCookie } from '../../../lib/auth-helpers';
import { db, collections, FieldValue } from '../../../lib/firestore';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callbackResponse;

    if (!session) {
      throw new Error('No session found');
    }
        // Programmatically register compliance webhooks (best-effort) for the shop.
        // Note: These handlers only log the webhook; actual data removal/response logic must be implemented properly.
        try {
          shopify.webhooks.addHandlers({
            CUSTOMERS_DATA_REQUEST: {
              deliveryMethod: 'http' as any,
              callbackUrl: '/api/webhooks/customers/data_request',
              callback: async (topic: string, shop: string, body: string) => {
                console.log('CUSTOMERS_DATA_REQUEST webhook:', shop, topic, body?.length);
              },
            },
            CUSTOMERS_REDACT: {
              deliveryMethod: 'http' as any,
              callbackUrl: '/api/webhooks/customers/redact',
              callback: async (topic: string, shop: string, body: string) => {
                console.log('CUSTOMERS_REDACT webhook:', shop, topic);
              },
            },
            SHOP_REDACT: {
              deliveryMethod: 'http' as any,
              callbackUrl: '/api/webhooks/shop/redact',
              callback: async (topic: string, shop: string, body: string) => {
                console.log('SHOP_REDACT webhook:', shop, topic);
              },
            },
            APP_UNINSTALLED: {
              deliveryMethod: 'http' as any,
              callbackUrl: '/api/webhooks/app/uninstalled',
              callback: async (topic: string, shop: string, body: string) => {
                console.log('APP_UNINSTALLED webhook:', shop, topic);
              },
            },
          });

          // Now attempt to register all handlers for the session
          await shopify.webhooks.register({ session });
          console.log('✅ Mandatory compliance webhooks registered via SDK');
          try {
            const client = new shopify.clients.Rest({ session });
            const resList = await client.get({ path: 'webhooks' });
            console.log('Registered webhooks for shop:', session.shop, resList.body?.webhooks || resList.body);
          } catch (err) {
            console.warn('Unable to list webhooks after registration:', err);
          }
        } catch (err) {
          console.error('Error registering compliance webhooks:', err);
        }

    // Check if this is a first-time install
    const shopDomain = session.shop;
    const settingsRef = db.collection(collections.users).doc(shopDomain);
    const settingsDoc = await settingsRef.get();
    
    const isFirstTimeInstall = !settingsDoc.exists;
    
    if (isFirstTimeInstall) {
      // Track first install
      await db.collection(collections.analytics).add({
        event: 'app_installed',
        shop: shopDomain,
        timestamp: FieldValue.serverTimestamp(),
        metadata: {},
      });
      
      console.log(`✅ New app installation tracked for shop: ${shopDomain}`);
      
      // Create user record immediately on installation
      await settingsRef.set({
        shop: shopDomain,
        enabled: false,
        onboardingCompleted: false, // Key flag to check if onboarding done
        logoUrl: '',
        popupTitle: '🎉 Instagram Giveaway! 🎉',
        rulesTitle: 'How to Enter:',
        giveawayRules: [
          'Follow us on Instagram',
          'Like our latest post',
          'Tag 2 friends in the comments',
          'Share this post to your story',
        ],
        formFieldLabel: 'Instagram Username',
        submitButtonText: 'Follow Us on Instagram',
        redirectUrl: '',
        installedAt: FieldValue.serverTimestamp(),
        registeredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastActivity: FieldValue.serverTimestamp(),
        status: 'pending', // pending until onboarding complete
      });
      
      console.log(`✅ User record created for shop: ${shopDomain}`);
    } else {
      // Update last activity for returning installs
      await settingsRef.update({
        lastActivity: FieldValue.serverTimestamp(),
      });
      
      console.log(`✅ Returning installation for shop: ${shopDomain}`);
    }

    // Get the host parameter for embedding
    const { host, shop } = req.query;
    const hostParam = (host as string) || '';
    const shopParam = (shop as string) || session.shop;
    
    // Construct embedded app URL
    const apiKey = process.env.SHOPIFY_API_KEY;
    const redirectShop = shopParam;
    
    // Always redirect to dashboard - it will check onboarding status
    const appPath = '/';
    
    // Build query params
    const queryParams = new URLSearchParams({
      shop: redirectShop,
      ...(hostParam && { host: hostParam }),
    }).toString();
    
    const redirectUrl = `https://${redirectShop}/admin/apps/${apiKey}${appPath}?${queryParams}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Callback error:', error);
    
    // Only send response if headers haven't been sent
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Authentication callback failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
