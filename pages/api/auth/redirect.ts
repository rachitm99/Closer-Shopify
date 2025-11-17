import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { shop } = req.query;

  if (!shop || typeof shop !== 'string') {
    return res.status(400).json({ error: 'Shop parameter required' });
  }

  // Redirect to auth endpoint
  return res.redirect(`/api/auth?shop=${shop}`);
}
