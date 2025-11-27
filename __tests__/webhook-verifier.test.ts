// @ts-nocheck
import { readAndVerifyShopifyWebhook } from '../lib/webhook-verifier';
import crypto from 'crypto';

function mockReqWithBody(bodyStr, secret) {
  const bodyBuffer = Buffer.from(bodyStr);
  const hmac = crypto.createHmac('sha256', secret).update(bodyBuffer).digest('base64');

  let listeners = {};
  return {
    headers: {
      'x-shopify-hmac-sha256': hmac,
    },
    on: (ev, cb) => {
      listeners[ev] = cb;
      // When data listener is added, immediately call it to simulate incoming chunks
      if (ev === 'data') {
        // Simulate one chunk
        process.nextTick(() => cb(bodyBuffer));
      }
      if (ev === 'end') {
        process.nextTick(() => listeners['end'] && listeners['end']());
      }
    }
  };
}

describe('readAndVerifyShopifyWebhook', () => {
  it('returns raw buffer for valid hmac', async () => {
    const body = JSON.stringify({ test: 'value' });
    const secret = 'test-secret';
    const req = mockReqWithBody(body, secret);
    const result = await readAndVerifyShopifyWebhook(req, secret);
    expect(result).not.toBeNull();
    expect(result.toString('utf8')).toEqual(body);
  });

  it('returns null for invalid hmac', async () => {
    const body = JSON.stringify({ test: 'value' });
    const secret = 'test-secret';
    const req = mockReqWithBody(body, secret);
    const result = await readAndVerifyShopifyWebhook(req, 'wrong-secret');
    expect(result).toBeNull();
  });
});
