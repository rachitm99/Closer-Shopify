import { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { getSessionFromRequest } from '../../../lib/auth-helpers';

const METAFIELD_NAMESPACE = 'reward_message_app';
const METAFIELD_KEY = 'enabled';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSessionFromRequest(req);

    if (!session || !session.accessToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = new shopify.clients.Rest({ 
      session,
      apiVersion: shopify.config.apiVersion
    });

    if (req.method === 'GET') {
      // Get current setting from metafield
      try {
        const response = await client.get({
          path: 'metafields',
          query: {
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
          },
        });

        const metafields = response.body as any;
        const metafield = metafields.metafields?.[0];

        return res.status(200).json({
          enabled: metafield?.value === 'true',
          metafieldId: metafield?.id,
        });
      } catch (error) {
        // If no metafield exists, return default (disabled)
        return res.status(200).json({
          enabled: false,
          metafieldId: null,
        });
      }
    } else if (req.method === 'POST') {
      // Update or create metafield
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid enabled value' });
      }

      // First, try to get existing metafield
      let existingMetafieldId: string | null = null;
      
      try {
        const response = await client.get({
          path: 'metafields',
          query: {
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
          },
        });

        const metafields = response.body as any;
        const metafield = metafields.metafields?.[0];
        existingMetafieldId = metafield?.id;
      } catch (error) {
        // No existing metafield
      }

      if (existingMetafieldId) {
        // Update existing metafield
        await client.put({
          path: `metafields/${existingMetafieldId}`,
          data: {
            metafield: {
              id: existingMetafieldId,
              value: enabled.toString(),
              type: 'single_line_text_field',
            },
          },
        });
      } else {
        // Create new metafield
        await client.post({
          path: 'metafields',
          data: {
            metafield: {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              value: enabled.toString(),
              type: 'single_line_text_field',
            },
          },
        });
      }

      return res.status(200).json({ 
        success: true,
        enabled,
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
