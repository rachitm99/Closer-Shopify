import type { NextApiRequest, NextApiResponse } from 'next';
import { Session } from '@shopify/shopify-api';
import { storeSession, loadSession } from '../../../lib/session-storage';
import { getSessionFromRequest } from '../../../lib/auth-helpers';

/**
 * Endpoint to check session health and fix if needed
 * Checks if session exists in Firebase with valid access token
 * Triggers re-auth if session is missing or invalid
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔧 Fix session: Starting health check...');
    
    // Get the current session from request (creates minimal session from token)
    const currentSession = await getSessionFromRequest(req);
    
    if (!currentSession) {
      console.log('🔧 Fix session: No session in request');
      return res.status(401).json({ 
        error: 'No session found',
        message: 'Please make sure you are authenticated'
      });
    }

    console.log('🔧 Fix session: Found session for shop:', currentSession.shop);
    
    // Check if offline session exists in Firebase
    const offlineSessionId = `offline_${currentSession.shop}`;
    console.log('🔧 Fix session: Checking Firebase for session:', offlineSessionId);
    
    const storedSession = await loadSession(offlineSessionId);
    
    if (!storedSession) {
      console.log('🔧 Fix session: ❌ No session in Firebase - need re-auth');
      return res.status(200).json({ 
        success: false,
        needsReauth: true,
        message: 'Session not found in storage. Re-authentication required.',
        authUrl: `/api/auth?shop=${currentSession.shop}`,
      });
    }
    
    if (!storedSession.accessToken) {
      console.log('🔧 Fix session: ❌ Session exists but no access token - need re-auth');
      return res.status(200).json({ 
        success: false,
        needsReauth: true,
        message: 'Access token not found. Re-authentication required.',
        authUrl: `/api/auth?shop=${currentSession.shop}`,
      });
    }
    
    console.log('🔧 Fix session: ✅ Valid session found in Firebase');
    console.log('🔧 Fix session: Has access token:', !!storedSession.accessToken);

    console.log('🔧 Fix session: ✅ Valid session found in Firebase');
    console.log('🔧 Fix session: Has access token:', !!storedSession.accessToken);

    // Session is healthy - no fix needed
    return res.status(200).json({
      success: true,
      message: 'Session is healthy',
      sessionId: storedSession.id,
      shop: storedSession.shop,
      hasAccessToken: !!storedSession.accessToken,
    });

  } catch (error: any) {
    console.error('🔧 Fix session error:', error);
    return res.status(500).json({ 
      error: 'Failed to fix session',
      details: error.message 
    });
  }
}
