import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import { db, collections, FieldValue, Timestamp } from '../../../lib/firestore';

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
  analytics?: {
    [key: string]: any;
  };
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
        const doc = await db.collection(collections.settings).doc(shop).get();
        
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
        const existingDoc = await db.collection(collections.settings).doc(shop).get();
        const existingData = existingDoc.exists ? existingDoc.data() : {};
        
        const settings: MerchantSettings = {
          shop,
          enabled: enabled !== undefined ? enabled : false,
          logoUrl: logoUrl || '',
          popupTitle: popupTitle || '🎉 Instagram Giveaway! 🎉',
          rulesTitle: rulesTitle || 'How to Enter:',
          giveawayRules: giveawayRules || [
            'Follow us on Instagram',
            'Like our latest post',
            'Tag 2 friends in the comments',
            'Share this post to your story',
            'Turn on post notifications',
            'Use our hashtag in your story'
          ],
          formFieldLabel: formFieldLabel || 'Instagram Username',
          submitButtonText: submitButtonText || 'Follow Us on Instagram',
          redirectUrl: redirectUrl || '',
          updatedAt: Timestamp.now(),
        };

        // Merge with existing data to preserve analytics and other fields
        const mergedSettings = {
          ...existingData,
          ...settings,
        };
        
        // If onboarding is being marked as complete, add that flag
        if (onboardingCompleted) {
          mergedSettings.onboardingCompleted = true;
          mergedSettings.analytics = {
            ...mergedSettings.analytics,
            onboarding_completed: FieldValue.serverTimestamp(),
          };
        }

        await db.collection(collections.settings).doc(shop).set(mergedSettings);
        
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
