import type { NextApiRequest, NextApiResponse } from 'next';
import { Session } from '@shopify/shopify-api';
import { storeSession } from '../../../lib/session-storage';
import { getSessionFromRequest } from '../../../lib/auth-helpers';

/**
 * Temporary endpoint to fix missing sessions without reinstalling
 * This takes the current authenticated session and stores it properly
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔧 Fix session: Starting...');
    
    // Get the current session from request
    const currentSession = await getSessionFromRequest(req);
    
    if (!currentSession) {
      console.log('🔧 Fix session: No session in request');
      return res.status(401).json({ 
        error: 'No session found',
        message: 'Please make sure you are authenticated'
      });
    }

    console.log('🔧 Fix session: Found session for shop:', currentSession.shop);
    console.log('🔧 Fix session: Has access token:', !!currentSession.accessToken);

    if (!currentSession.accessToken) {
      console.log('🔧 Fix session: Session has no access token, cannot fix');
      return res.status(400).json({ 
        error: 'Session has no access token',
        message: 'This session cannot be stored. Please reinstall the app.'
      });
    }

    // Create a proper offline session
    const offlineSession = new Session({
      id: `offline_${currentSession.shop}`,
      shop: currentSession.shop,
      state: currentSession.state || 'fix-session',
      isOnline: false,
      accessToken: currentSession.accessToken,
      scope: currentSession.scope,
    });

    console.log('🔧 Fix session: Created offline session with ID:', offlineSession.id);

    // Store it
    const stored = await storeSession(offlineSession);

    if (stored) {
      console.log('✅ Fix session: Successfully stored session');
      return res.status(200).json({
        success: true,
        message: 'Session fixed successfully',
        sessionId: offlineSession.id,
        shop: offlineSession.shop,
      });
    } else {
      console.log('❌ Fix session: Failed to store session');
      return res.status(500).json({
        success: false,
        error: 'Failed to store session',
      });
    }

  } catch (error: any) {
    console.error('🔧 Fix session error:', error);
    return res.status(500).json({ 
      error: 'Failed to fix session',
      details: error.message 
    });
  }
}
