import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest, validateShopDomain } from '../../../lib/auth-helpers';

// Query a few common fields; extend as needed
const ORDER_QUERY = `query getOrder($id: ID!) {
  order(id: $id) {
    id
    name
    processedAt
    email
    financialStatus
    fulfillmentStatus
    totalPriceSet { shopMoney { amount currencyCode } }
    customer { id email displayName }
    lineItems(first: 50) { edges { node { title quantity originalUnitPriceSet { shopMoney { amount currencyCode } } } } }
    fulfillments { trackingInfo { number company } }
  }
}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS: allow extension hosts to call this route (handle preflight)
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Respond to preflight requests without auth
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { shop: bodyShop, orderId } = req.body || {};
  if (!orderId) {
    return res.status(400).json({ error: 'Missing "orderId" in request body' });
  }

  // Validate session token from the Authorization header or cookie
  const session = await getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing session token' });
  }

  const shop = session.shop || bodyShop;
  if (!shop || !validateShopDomain(shop)) {
    return res.status(400).json({ error: 'Invalid shop domain' });
  }

  // Prefer using stored session access token if available; fall back to env admin token
  const accessToken = (session as any).accessToken || process.env.SHOPIFY_ADMIN_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'Server misconfiguration: missing access token' });
  }

  try {
    const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query: ORDER_QUERY, variables: { id: orderId } }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Shopify GraphQL request failed with status', response.status, text);
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Shopify GraphQL request failed:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}
