import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import { db, collections, FieldValue, Timestamp } from '../../../lib/firestore';
import axios from 'axios';

export interface MerchantSettings {
  shop: string;
  enabled: boolean;
  // Popup configuration
  logoUrl?: string;
  popupTitle: string;
  subtitleTop?: string; // shown under the popup title
  subtitleBottom?: string; // shown below the follow/submit button
  rulesTitle: string;
  giveawayRules: string[];
  formFieldLabel: string;
  submitButtonText: string;
  redirectUrl?: string;
  bannerUrl?: string;
  countdownDays?: number;
  countdownHours?: number;
  countdownMinutes?: number;
  countdownSeconds?: number;
  updatedAt: FirebaseFirestore.Timestamp;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: FirebaseFirestore.Timestamp;
  registeredAt?: FirebaseFirestore.Timestamp;
  lastActivity?: FirebaseFirestore.Timestamp;
  status?: string;
} 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔷 API /settings/merchant - Request received');
  console.log('🔷 API /settings/merchant - Method:', req.method);
  console.log('🔷 API /settings/merchant - Headers auth:', req.headers.authorization ? 'Present' : 'Not present');
  console.log('🔷 API /settings/merchant - Cookies:', req.headers.cookie ? 'Present' : 'Not present');
  
  try {
    console.log('🔷 API /settings/merchant - Getting session from request...');
    const session = await getSessionFromRequest(req);
    console.log('🔷 API /settings/merchant - Session result:', session ? `Found for ${session.shop}` : 'Not found');
    
    if (!session) {
      console.log('❌ API /settings/merchant - No session, returning 401');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shop } = session;
    console.log('🔷 API /settings/merchant - Shop:', shop);

    if (req.method === 'GET') {
      console.log('🔷 API /settings/merchant - GET request, fetching from Firestore...');
      // Get merchant settings
      try {
        console.log('🔷 API /settings/merchant - Querying Firestore collection:', collections.users, 'doc:', shop);
        const doc = await db.collection(collections.users).doc(shop).get();
        console.log('🔷 API /settings/merchant - Firestore query complete, exists:', doc.exists);
        
        if (doc.exists) {
          const data = doc.data();
          console.log('✅ API /settings/merchant - Found existing data for shop');

          // Backward compatibility: convert old string format to array
          if (data && data.giveawayRules && typeof data.giveawayRules === 'string') {
            data.giveawayRules = [data.giveawayRules];
          }

          // Backward compatibility for subtitle fields: older docs may use `subtitle`
          if (data) {
            if (!data.subtitleTop && data.subtitle) {
              data.subtitleTop = data.subtitle;
            }
            if (!data.subtitleBottom && data.subtitle) {
              data.subtitleBottom = data.subtitle;
            }
            // Ensure both keys exist (even if empty)
            data.subtitleTop = data.subtitleTop || '';
            data.subtitleBottom = data.subtitleBottom || '';
          }

          console.log('✅ API /settings/merchant - Returning data');
          return res.status(200).json(data);
        } else {
          console.log('⚠️ API /settings/merchant - No existing data, returning defaults');
          // Return default settings
          const defaultSettings: MerchantSettings = {
            shop,
            enabled: false,
            logoUrl: '',
            popupTitle: '🎉 Instagram Giveaway! 🎉',
            subtitleTop: '',
            subtitleBottom: '',
            rulesTitle: 'How to Enter:',
            giveawayRules: [
              'Follow us on Instagram',
              'Like our latest post',
              'Tag 2 friends in the comments',
              'Share this post to your story',
              'Turn on post notifications',
              'Use our hashtag in your story'
            ],
            formFieldLabel: 'Instagram Username',
            submitButtonText: 'Follow Us on Instagram',
            redirectUrl: '',
            updatedAt: Timestamp.now(),
          };
          return res.status(200).json(defaultSettings);
        }
      } catch (error) {
        console.error('💥 API /settings/merchant - Firestore error:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }
    } else if (req.method === 'POST') {
      // Update merchant settings
      try {
        const { 
          enabled, 
          logoUrl, 
          bannerUrl,
          countdownDays,
          countdownHours,
          countdownMinutes,
          countdownSeconds,
          popupTitle,
          subtitleTop,
          subtitleBottom,
          rulesTitle,
          giveawayRules, 
          formFieldLabel,
          submitButtonText, 
          redirectUrl,
          onboardingCompleted,
        } = req.body;
        
        // Get existing settings to preserve fields not being updated
        const existingDoc = await db.collection(collections.users).doc(shop).get();
        const existingData = existingDoc.exists ? existingDoc.data() : {};
        
        // Build update object with only provided fields
        const updateData: any = {
          shop,
          updatedAt: Timestamp.now(),
        };
        
        // Only update fields that are explicitly provided
        if (enabled !== undefined) updateData.enabled = enabled;
        if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
        if (popupTitle !== undefined) updateData.popupTitle = popupTitle;
        if (subtitleTop !== undefined) updateData.subtitleTop = subtitleTop;
        if (subtitleBottom !== undefined) updateData.subtitleBottom = subtitleBottom;
        if (rulesTitle !== undefined) updateData.rulesTitle = rulesTitle; 
        if (giveawayRules !== undefined) updateData.giveawayRules = giveawayRules;
        if (formFieldLabel !== undefined) updateData.formFieldLabel = formFieldLabel;
        if (submitButtonText !== undefined) updateData.submitButtonText = submitButtonText;
        if (redirectUrl !== undefined) updateData.redirectUrl = redirectUrl;
        // Optional banner and countdown settings
        if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
        if (countdownDays !== undefined) updateData.countdownDays = countdownDays;
        if (countdownHours !== undefined) updateData.countdownHours = countdownHours;
        if (countdownMinutes !== undefined) updateData.countdownMinutes = countdownMinutes;
        if (countdownSeconds !== undefined) updateData.countdownSeconds = countdownSeconds;


        // Merge with existing data to preserve analytics and other fields
        const mergedSettings = {
          ...existingData,
          ...updateData,
        };
        
        // If onboarding is being marked as complete, add that flag
        if (onboardingCompleted) {
          mergedSettings.onboardingCompleted = true;
          mergedSettings.onboardingCompletedAt = FieldValue.serverTimestamp();
        }

        const redirectUrlFinal = mergedSettings.redirectUrl || '';
        const instagramUsername = extractInstagramUsername(redirectUrlFinal);
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
                mergedSettings.pkId = user.id
                mergedSettings.brandInstaHandle = instagramUsername;
                 
                
              }
            } catch (err) {
              mergedSettings.pkId = mergedSettings.pkId || null;
              mergedSettings.brandInstaHandle = instagramUsername;
              console.error('Instagram lookup failed:', err);
            }
          
        } else {
          console.log('No valid Instagram username extracted from URL:', redirectUrlFinal);
          mergedSettings.pkId = mergedSettings.pkId || null;
          mergedSettings.brandInstaHandle = instagramUsername || '';
        }
        await db.collection(collections.users).doc(shop).set(mergedSettings);
        
        console.log('Settings updated for shop:', shop);
        return res.status(200).json(mergedSettings);
      } catch (error) {
        console.error('Error updating settings:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
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

