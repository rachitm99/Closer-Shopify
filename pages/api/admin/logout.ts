import type { NextApiRequest, NextApiResponse } from 'next';
import { clearSuperAdminSessionCookie } from '../../../lib/super-admin-auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearSuperAdminSessionCookie(res);
  return res.status(200).json({ success: true });
}
