import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest, validateShopDomain } from '../../../lib/auth-helpers';

const PRODUCT_VARIANT_QUERY = `query getFirstVariant($id: ID!) {
  product(id: $id) {
    variants(first:1) { edges { node { id } } }
  }
}`;

const ORDER_EDIT_BEGIN = `mutation orderEditBegin($id: ID!) {
  orderEditBegin(id: $id) {
    calculatedOrder { id }
    userErrors { field message }
  }
}`;

const ORDER_EDIT_ADD_LINE = `mutation orderEditAddLineItem($id: ID!, $variantId: ID!, $quantity: Int!) {
  orderEditAddLineItem(id: $id, variantId: $variantId, quantity: $quantity) {
    calculatedOrder { id }
    userErrors { field message }
  }
}`;

const ORDER_EDIT_COMMIT = `mutation orderEditCommit($id: ID!) {
  orderEditCommit(id: $id, notifyCustomer: false) {
    order { id }
    userErrors { field message }
  }
}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { shop: bodyShop, orderId, productId, variantId, quantity = 1 } = req.body || {};
  if (!orderId || (!productId && !variantId)) {
    return res.status(400).json({ error: 'Missing orderId and productId/variantId in request body' });
  }

  // Validate session
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized: missing session' });

  let shop = session.shop || bodyShop;
  if (shop && !shop.endsWith('.myshopify.com') && !shop.includes('.')) shop = `${shop}.myshopify.com`;
  if (!shop || !validateShopDomain(shop)) return res.status(400).json({ error: 'Invalid shop domain', shop });

  const accessToken = (session as any).accessToken || process.env.SHOPIFY_ADMIN_TOKEN;
  if (!accessToken) return res.status(401).json({ error: 'Unauthorized: no access token available', shop });

  try {
    // Determine variant to use: prefer variantId if provided, otherwise fetch first variant for product
    let variantGid: string | undefined;

    if (variantId) {
      variantGid = String(variantId).startsWith('gid://') ? variantId : `gid://shopify/ProductVariant/${variantId}`;
      console.log('OrderAddProduct - using provided variantId:', variantGid);
    } else {
      // Convert numeric product id to GID if needed
      const productGid = String(productId).startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;

      // 1) Fetch first variant for product
      const variantPayload = { query: PRODUCT_VARIANT_QUERY, variables: { id: productGid } };
      console.log('OrderAddProduct - fetching product variant:', { shop, variables: variantPayload.variables });

      const variantResp = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
        body: JSON.stringify(variantPayload),
      });

      const variantData = await variantResp.json();
      if (variantData.errors) {
        console.error('OrderAddProduct - Product variant query errors:', variantData.errors);
        return res.status(500).json({ error: 'Failed to fetch product variant', details: variantData });
      }

      const variantNode = variantData.data?.product?.variants?.edges?.[0]?.node;
      if (!variantNode || !variantNode.id) {
        return res.status(404).json({ error: 'No variant found for product', productId: productGid });
      }

      variantGid = variantNode.id;
    }

    // 2) Begin order edit
    const beginBody = { query: ORDER_EDIT_BEGIN, variables: { id: orderId } };
    console.log('OrderAddProduct - begin edit payload:', { shop, variables: beginBody.variables });
    const beginResp = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify(beginBody),
    });
    const beginData = await beginResp.json();
    if (beginData.errors || beginData.data?.orderEditBegin?.userErrors?.length) {
      console.error('OrderAddProduct - orderEditBegin errors:', beginData.errors || beginData.data.orderEditBegin.userErrors);
      return res.status(500).json({ error: 'orderEditBegin failed', details: beginData });
    }

    const calculatedOrderId = beginData.data.orderEditBegin.calculatedOrder.id;

    // 3) Add line item
    const addLineBody = { query: ORDER_EDIT_ADD_LINE, variables: { id: calculatedOrderId, variantId, quantity: Number(quantity) } };
    console.log('OrderAddProduct - add line payload:', { shop, variables: addLineBody.variables });

    const addResp = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify(addLineBody),
    });

    const addData = await addResp.json();
    if (addData.errors || addData.data?.orderEditAddLineItem?.userErrors?.length) {
      console.error('OrderAddProduct - orderEditAddLineItem errors:', addData.errors || addData.data.orderEditAddLineItem.userErrors);
      return res.status(500).json({ error: 'orderEditAddLineItem failed', details: addData });
    }

    // 4) Commit edit
    const commitBody = { query: ORDER_EDIT_COMMIT, variables: { id: calculatedOrderId } };
    console.log('OrderAddProduct - commit payload:', { shop, variables: commitBody.variables });

    const commitResp = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify(commitBody),
    });

    const commitData = await commitResp.json();
    if (commitData.errors || commitData.data?.orderEditCommit?.userErrors?.length) {
      console.error('OrderAddProduct - orderEditCommit errors:', commitData.errors || commitData.data.orderEditCommit.userErrors);
      return res.status(500).json({ error: 'orderEditCommit failed', details: commitData });
    }

    return res.status(200).json({ success: true, commit: commitData });
  } catch (err: any) {
    console.error('OrderAddProduct - unexpected error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}
