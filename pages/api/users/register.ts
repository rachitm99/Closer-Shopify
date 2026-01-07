import type { NextApiRequest, NextApiResponse } from 'next';
import { db, collections, Timestamp } from '../../../lib/firestore';
import axios from 'axios';
import { use } from 'react';

/**
 * User Registration API
 * Creates a user record when merchant completes onboarding
 * Stores all merchant details in a users collection
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      shop,
      logoUrl,
      bannerUrl,
      popupTitle,
      subtitleTop,
      subtitleBottom,
      rulesTitle,
      rulesDescription,
      formFieldLabel,
      giveawayRules,
      submitButtonText,
      countdownEndDate,
      countdownTitle,
      redirectUrl,
    } = req.body;

    console.log('👤 Registering user for shop:', shop);

    if (!shop) {
      return res.status(400).json({ error: 'Shop is required' });
    }

    if (!redirectUrl) {
      return res.status(400).json({ error: 'Instagram profile URL is required' });
    }

    // Update user record to mark onboarding complete
    const userDoc = db.collection(collections.users).doc(shop);
    
    const userData = {
      shop: shop,
      enabled: true, // Extension enabled by default after onboarding
      // Store both bannerUrl and logoUrl (banner preferred)
      bannerUrl: bannerUrl || logoUrl || '',
      logoUrl: logoUrl || bannerUrl || '',
      popupTitle: popupTitle || 'Win ₹1,000 worth of products',
      subtitleTop: subtitleTop || 'Follow us on Instagram to enter the giveaway',
      subtitleBottom: subtitleBottom || '3 lucky Winners announced on Instagram on 3rd Jan 2026',
      rulesTitle: rulesTitle || 'How to Enter:',
      giveawayRules: giveawayRules || [
        'Follow us on Instagram',
        'Like our latest post',
        'Tag 2 friends in the comments',
        'Share this post to your story',
      ],
      rulesDescription: rulesDescription || 'Enter your Instagram handle and follow @{{your instagram profile url}} to enter',
      formFieldLabel: formFieldLabel || 'Instagram Username',
      submitButtonText: submitButtonText || 'Follow & Enter Giveaway 🎁',
      countdownEndDate: countdownEndDate,
      countdownTitle: countdownTitle || '⏳ Giveaway ends in ⏳',
      redirectUrl: redirectUrl,
      onboardingCompleted: true, // Mark as complete
      onboardingCompletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastActivity: Timestamp.now(),
      status: 'active', // Change from pending to active
      pkId: null,
      brandInstaHandle: '',
    };
    const instagramUsername = extractInstagramUsername(redirectUrl);
    if (instagramUsername != null) {
          
            try {
              const result = await axios.post(
                'https://v1.rocketapi.io/instagram/user/get_web_profile_info',
                { username: instagramUsername },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${process.env.ROCKET_API_KEY}`,
                  },
                }
              );

              // Response path: result.data.response.body.data.user
              const user = result?.data?.response?.body?.data?.user;
              if (user) {
                console.log('Instagram user found:', user.username);  
                // Save only the id and name (use full_name if available, otherwise username)
                userData.pkId = user.id
                userData.brandInstaHandle = instagramUsername;
                 
                
              }
            } catch (err) {
              userData.pkId =  null;
              userData.brandInstaHandle = instagramUsername;
              console.error('Instagram lookup failed:', err);
            }
          
        } else {
          console.log('No valid Instagram username extracted from URL:', redirectUrl);
          userData.pkId = userData.pkId || null;
          userData.brandInstaHandle = instagramUsername || '';
        }

    await userDoc.set(userData, { merge: true });

    console.log('✅ Onboarding completed for user:', shop);

    return res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      user: userData,
    });
  } catch (error) {
    console.error('❌ Error registering user:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}


function extractInstagramUsername(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Ensure it's an Instagram URL
    if (!parsed.hostname.includes("instagram.com")) return null;

    // pathname looks like: "/birdsofparadyes/"
    const parts = parsed.pathname.split("/").filter(Boolean);

    // First part of the path is the username
    return parts.length > 0 ? parts[0] : null;
  } catch {
    return null; // Invalid URL
  }
}