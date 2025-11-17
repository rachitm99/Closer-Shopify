import { NextApiRequest, NextApiResponse } from 'next';
import shopify from '../../../lib/shopify';
import { loadSession } from '../../../lib/session-storage';

const METAFIELD_NAMESPACE = 'reward_message_app';
const METAFIELD_KEY = 'enabled';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get shop from query parameter (Shopify app proxy includes this)
    const { shop } = req.query;

    if (!shop || typeof shop !== 'string') {
      return res.status(400).send('<!-- Shop parameter missing -->');
    }

    // Load session for this shop
    const session = await loadSession(shop);

    if (!session || !session.accessToken) {
      return res.status(200).send('<!-- Not authenticated -->');
    }

    const client = new shopify.clients.Rest({ 
      session,
      apiVersion: shopify.config.apiVersion
    });

    // Check if reward message is enabled
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
      const isEnabled = metafield?.value === 'true';

      if (!isEnabled) {
        return res.status(200).send('<!-- Reward message disabled -->');
      }

      // Return HTML/CSS for the reward message
      const html = `
        <div id="reward-message-container" style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          animation: slideIn 0.5s ease-out;
        ">
          <div style="
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
          ">
            🎉 Congratulations!
          </div>
          <div style="
            font-size: 18px;
          ">
            You have won a reward!
          </div>
        </div>
        <style>
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        </style>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (error) {
      // If metafield doesn't exist or error occurs, don't show message
      return res.status(200).send('<!-- Error or disabled -->');
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(200).send('<!-- Error occurred -->');
  }
}
