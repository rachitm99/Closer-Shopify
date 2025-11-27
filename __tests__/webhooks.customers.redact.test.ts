// @ts-nocheck
import handler from '../pages/api/webhooks/customers/redact';
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('../lib/webhook-verifier', () => ({
  readAndVerifyShopifyWebhook: jest.fn(async () => JSON.stringify({
    shop: 'shop.myshopify.com',
    customer: { id: '1234', email: 'test@example.com' }
  }))
}));

// Mock Firestore
const mockUpdate = jest.fn();
const mockBatch = { update: jest.fn(), commit: jest.fn() } as any;
const mockDelete = jest.fn();

jest.mock('../lib/firestore', () => ({
  db: {
    collection: (name: string) => ({
      where: () => ({
        get: async () => ({
          empty: false,
          forEach: (cb: any) => cb({ ref: { update: mockUpdate } }),
        })
      })
    })
  },
  collections: { submissions: 'submissions' },
  FieldValue: { delete: () => 'FIELD_DELETE', serverTimestamp: () => 'SERVER_TS' }
}));

function mockNextApiResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('customers/redact webhook', () => {
  it('responds 200 when payload is valid and redaction occurs', async () => {
    const req: Partial<NextApiRequest> = { headers: { 'x-shopify-shop-domain': 'shop.myshopify.com' } };
    const res = mockNextApiResponse();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
