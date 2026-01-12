import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '../../../lib/auth-helpers';
import shopify, { Session } from '../../../lib/shopify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionData = await getSessionFromRequest(req);
    
    if (!sessionData) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shop, accessToken } = sessionData;
    const limit = parseInt(req.query.limit as string) || 20;

    // Create a proper Shopify Session object
    const session = new Session({
      id: `offline_${shop}`,
      shop,
      state: 'active',
      isOnline: false,
      accessToken: accessToken || '',
    });

    // Fetch products using Shopify REST API
    const client = new shopify.clients.Rest({ session });
    
    const response = await client.get({
      path: 'products',
      query: {
        limit: limit.toString(),
        fields: 'id,title,handle,image,variants',
      },
    });

    const products = (response.body as any).products || [];
    
    // Format products with variants
    const formattedProducts = products.map((p: any) => ({
      id: p.id.toString(),
      title: p.title,
      handle: p.handle,
      image: p.image?.src || null,
      variants: (p.variants || []).map((v: any) => ({
        id: v.id.toString(),
        title: v.title,
        price: v.price,
        available: v.inventory_quantity > 0,
      })),
    }));

    res.status(200).json({ products: formattedProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}
