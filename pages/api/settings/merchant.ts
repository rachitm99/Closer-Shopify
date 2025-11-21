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
  rulesTitle: string;
  giveawayRules: string[];
  formFieldLabel: string;
  submitButtonText: string;
  redirectUrl?: string;
  updatedAt: FirebaseFirestore.Timestamp;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: FirebaseFirestore.Timestamp;
  registeredAt?: FirebaseFirestore.Timestamp;
  lastActivity?: FirebaseFirestore.Timestamp;
  status?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSessionFromRequest(req);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shop } = session;

    if (req.method === 'GET') {
      // Get merchant settings
      try {
        const doc = await db.collection(collections.users).doc(shop).get();
        
        if (doc.exists) {
          const data = doc.data();
          
          // Backward compatibility: convert old string format to array
          if (data && data.giveawayRules && typeof data.giveawayRules === 'string') {
            data.giveawayRules = [data.giveawayRules];
          }
          
          return res.status(200).json(data);
        } else {
          // Return default settings
          const defaultSettings: MerchantSettings = {
            shop,
            enabled: false,
            logoUrl: '',
            popupTitle: '🎉 Instagram Giveaway! 🎉',
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
        console.error('Error fetching settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }
    } else if (req.method === 'POST') {
      // Update merchant settings
      try {
        const { 
          enabled, 
          logoUrl, 
          popupTitle,
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
        if (rulesTitle !== undefined) updateData.rulesTitle = rulesTitle;
        if (giveawayRules !== undefined) updateData.giveawayRules = giveawayRules;
        if (formFieldLabel !== undefined) updateData.formFieldLabel = formFieldLabel;
        if (submitButtonText !== undefined) updateData.submitButtonText = submitButtonText;
        if (redirectUrl !== undefined) updateData.redirectUrl = redirectUrl;


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
                    'Authorization': `Token ${process.env.SHOPIFY_API_SECRET}`,
                  },
                }
              );

              // Response path: result.data.response.body.data.user
              const user = result?.data?.response?.body?.data?.user;
              if (user) {
                // Save only the id and name (use full_name if available, otherwise username)
                mergedSettings.pkid = user.id
                 
                
              }
            } catch (err) {
              mergedSettings.pkid = mergedSettings.pkid || null;
              console.error('Instagram lookup failed:', err);
            }
          
        } else {
          mergedSettings.pkid = mergedSettings.pkid || null;
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

