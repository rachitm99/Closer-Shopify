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
  const hmacHeader = (req.headers['x-shopify-hmac-sha256'] || req.headers['X-Shopify-Hmac-Sha256']) as string | undefined;
  if (!hmacHeader) return null;
  const generatedHash = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');
  if (!crypto.timingSafeEqual(Buffer.from(generatedHash), Buffer.from(hmacHeader))) return null;
  return rawBody;
}
