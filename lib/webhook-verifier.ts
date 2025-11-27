import { NextApiRequest } from 'next';
import crypto from 'crypto';

/**
 * Reads the raw body from a request and verifies the Shopify HMAC signature.
 * Returns the raw body buffer if valid, null if invalid.
 */
export async function readAndVerifyShopifyWebhook(
  req: NextApiRequest,
  secret: string
): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks);
      const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
      
      if (!hmacHeader) {
        console.error('Webhook verification failed: Missing HMAC header');
        resolve(null);
        return;
      }
      
      if (!secret) {
        console.error('Webhook verification failed: Missing API secret');
        resolve(null);
        return;
      }
      
      // Calculate expected HMAC
      const calculatedHmac = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');
      
      // Use timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(hmacHeader),
        Buffer.from(calculatedHmac)
      );
      
      if (!isValid) {
        console.error('Webhook verification failed: HMAC mismatch');
        resolve(null);
        return;
      }
      
      console.log('✅ Webhook HMAC verified successfully');
      resolve(rawBody);
    });
    
    req.on('error', (err) => {
      console.error('Webhook verification failed: Stream error', err);
      resolve(null);
    });
  });
}

/**
 * Verifies a Shopify webhook HMAC signature given a raw body buffer.
 */
export function verifyWebhookHmac(rawBody: Buffer, hmacHeader: string, secret: string): boolean {
  if (!hmacHeader || !secret) {
    return false;
  }
  
  const calculatedHmac = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmacHeader),
      Buffer.from(calculatedHmac)
    );
  } catch {
    return false;
  }
}
