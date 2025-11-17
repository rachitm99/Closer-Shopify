import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return res.status(200).json({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiKeyFirstChars: process.env.SHOPIFY_API_KEY?.substring(0, 8),
    hasSecret: !!process.env.SHOPIFY_API_SECRET,
    host: process.env.HOST,
    nodeEnv: process.env.NODE_ENV,
  });
}
