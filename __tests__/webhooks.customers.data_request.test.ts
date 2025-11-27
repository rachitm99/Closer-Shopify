// @ts-nocheck
import handler from '../pages/api/webhooks/customers/data_request';

jest.mock('../lib/webhook-verifier', () => ({
  readAndVerifyShopifyWebhook: jest.fn(async () => JSON.stringify({
    shop: 'shop.myshopify.com',
    customer: { id: '1234', email: 'test@example.com' }
  }))
}));

jest.mock('../lib/firestore', () => ({
  db: {
    collection: (name: string) => ({
      where: () => ({
        get: async () => ({
          empty: false,
          forEach: (cb: any) => cb({ id: 'doc1', data: () => ({ shop: 'shop.myshopify.com', customerId: '1234', customerEmail: 'test@example.com' }) }),
        })
      })
    })
  },
  collections: { submissions: 'submissions' },
}));

function mockNextApiResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('customers/data_request webhook', () => {
  it('responds 200 and returns submissions when found', async () => {
    const req = { headers: { 'x-shopify-shop-domain': 'shop.myshopify.com' } };
    const res = mockNextApiResponse();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    // Check that the response returns data array
    expect(Array.isArray(res.json.mock.calls[0][0].data)).toBe(true);
  });
});
