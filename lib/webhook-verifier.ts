import crypto from 'crypto';
import { NextApiRequest } from 'next';

export async function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function readAndVerifyShopifyWebhook(req: NextApiRequest, secret: string): Promise<Buffer | null> {
  const rawBody = await buffer(req);
  if (!secret) {
    console.warn('SHOPIFY_API_SECRET is not set - webhook HMAC verification not possible');
    return null;
  }
  const hmacHeader = (req.headers['x-shopify-hmac-sha256'] || req.headers['X-Shopify-Hmac-Sha256']) as string | undefined;
  if (!hmacHeader) return null;
  const generatedHash = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');
  // Compare timing safe and log mismatch for debugging
  const valid = (Buffer.from(generatedHash).length === Buffer.from(hmacHeader).length) &&
    crypto.timingSafeEqual(Buffer.from(generatedHash), Buffer.from(hmacHeader));
  if (!valid) {
    console.warn('Webhook HMAC mismatch (computed vs header):', generatedHash.substring(0, 8), '!=', (hmacHeader || '').substring(0, 8));
    return null;
  }
  return rawBody;
}
