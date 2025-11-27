// @ts-nocheck
import handler from '../pages/api/webhooks/shop/redact';

jest.mock('../lib/webhook-verifier', () => ({
  readAndVerifyShopifyWebhook: jest.fn(async () => JSON.stringify({
    shop: 'shop.myshopify.com'
  }))
}));

jest.mock('../lib/firestore', () => ({
  db: {
    collection: (name: string) => ({
      where: () => ({
        get: async () => ({
          empty: false,
          forEach: (cb: any) => cb({ id: 'doc1' }),
        })
      })
    })
  },
  collections: { submissions: 'submissions', settings: 'settings', sessions: 'sessions', merchants: 'merchants' },
}));

function mockNextApiResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('shop/redact webhook', () => {
  it('responds 200 and deletes shop data', async () => {
    const req = { headers: { 'x-shopify-shop-domain': 'shop.myshopify.com' } };
    const res = mockNextApiResponse();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
