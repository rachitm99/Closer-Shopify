import { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { storeSession } from '../../../lib/session-storage';
import { setSessionCookie } from '../../../lib/auth-helpers';
import { db, collections, FieldValue } from '../../../lib/firestore';
import { DEFAULT_SETTINGS } from '../../../lib/defaultSettings';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🎯 ========================================');
  console.log('🎯 CALLBACK ENDPOINT HIT!');
  console.log('🎯 Method:', req.method);
  console.log('🎯 URL:', req.url);
  console.log('🎯 Query params:', JSON.stringify(req.query));
  console.log('🎯 ========================================');
  
  try {
    console.log('🔄 Starting shopify.auth.callback...');
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });
    console.log('✅ shopify.auth.callback completed');

    const { session } = callbackResponse;

    if (!session) {
      console.error('❌ No session returned from callback!');
      throw new Error('No session found');
    }

    console.log('🔍 Callback received session:', {
      shop: session.shop,
      id: session.id,
      isOnline: session.isOnline,
      hasAccessToken: !!session.accessToken,
      accessTokenLength: session.accessToken?.length || 0,
      scope: session.scope,
      state: session.state,
    });

    // CRITICAL: Verify this is an offline session
    if (session.isOnline) {
      console.error('❌ Callback received ONLINE session instead of OFFLINE!');
    } else {
      console.log('✅ Callback received OFFLINE session (correct)');
    }
    
    if (!session.accessToken) {
      console.error('❌ Callback session has NO ACCESS TOKEN!');
    } else {
      console.log('✅ Callback session has access token:', session.accessToken.substring(0, 20) + '...');
    }

    // Persist the session (store offline session and set cookie for subsequent requests)
    try {
      const stored = await storeSession(session);
      if (stored) {
        console.log('✅ Session persisted for shop:', session.shop, 'accessTokenPresent:', !!session.accessToken);
      } else {
        console.warn('⚠️ Session persistence returned false for shop:', session.shop);
      }

      // Set a session cookie so server can fall back to cookie-based auth if needed
      try {
        setSessionCookie(res, session);
        console.log('✅ Session cookie set for shop:', session.shop);
      } catch (cookieErr) {
        console.warn('⚠️ Failed to set session cookie:', cookieErr);
      }
    } catch (err) {
      console.error('Error persisting session:', err);
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
        popupTitle: DEFAULT_SETTINGS.popupTitle,
        subtitleTop: DEFAULT_SETTINGS.subtitleTop,
        subtitleBottom: DEFAULT_SETTINGS.subtitleBottom,
        rulesTitle: DEFAULT_SETTINGS.rulesTitle,
        rulesDescription: DEFAULT_SETTINGS.rulesDescription,
        giveawayRules: DEFAULT_SETTINGS.giveawayRules,
        formFieldLabel: DEFAULT_SETTINGS.formFieldLabel,
        submitButtonText: DEFAULT_SETTINGS.submitButtonText,
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
