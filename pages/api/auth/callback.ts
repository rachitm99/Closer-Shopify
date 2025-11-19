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

    // Store the session (offline token - never expires)
    await storeSession(session);

    // Set session cookies (ID + encrypted data for redundancy)
    setSessionCookie(res, session);

    // Check if this is a first-time install
    const shopDomain = session.shop;
    const settingsRef = db.collection(collections.settings).doc(shopDomain);
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
      
      // Initialize default settings
      await settingsRef.set({
        enabled: false,
        installedAt: FieldValue.serverTimestamp(),
        lastActivity: FieldValue.serverTimestamp(),
        analytics: {
          app_installed: FieldValue.serverTimestamp(),
        },
      });
    }

    // Get the host parameter for embedding
    const { host, shop } = req.query;
    
    // Construct embedded app URL
    const apiKey = process.env.SHOPIFY_API_KEY;
    const redirectShop = shop || session.shop;
    
    // Redirect to onboarding for first-time installs, otherwise to main dashboard
    const appPath = isFirstTimeInstall ? '/onboarding' : '/';
    const redirectUrl = `https://${redirectShop}/admin/apps/${apiKey}${appPath}`;
    
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
