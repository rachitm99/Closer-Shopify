/*
  Simple script to send a test webhook payload to a local or deployed endpoint with a valid Shopify HMAC header.

  Usage:
    node scripts/send-test-webhook.js <url> <secret> <topic>

  Example:
    node scripts/send-test-webhook.js https://your-app.vercel.app/api/webhooks/customers/data_request mysecret CUSTOMERS_DATA_REQUEST
*/

const crypto = require('crypto');
const fetch = require('node-fetch');

async function send(url, secret, topic) {
  const body = JSON.stringify({
    id: 'test-customer-123',
    customer: { id: '123', email: 'test@example.com' },
    shop: 'shop.test.myshopify.com'
  });

  const hmac = crypto.createHmac('sha256', secret).update(Buffer.from(body)).digest('base64');

  console.log('Sending test webhook to:', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Hmac-Sha256': hmac,
      'X-Shopify-Topic': topic,
      'X-Shopify-Shop-Domain': 'shop.test.myshopify.com'
    },
    body
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node scripts/send-test-webhook.js <url> <secret> <topic>');
  process.exit(1);
}

send(args[0], args[1], args[2]).catch(err => { console.error(err); process.exit(1); });
