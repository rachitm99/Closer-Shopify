import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log raw request for debugging
    console.error('[CLIENT LOG - RAW BODY]', req.body);
    console.error('[CLIENT LOG - HEADERS]', req.headers);

    const { type, error, stack, context, url, userAgent, timestamp, mounted, visible, domSnapshot, note } = req.body || {};

    // Defensive validation
    if (!type) {
      console.error('[CLIENT LOG] Missing type field in client log');
      return res.status(400).json({ ok: false, error: 'Missing type field' });
    }

    // Basic server-side log for debugging - teams may forward this to Sentry/Datadog later
    console.error('[CLIENT LOG]', { type, error, stack, context, url, userAgent, timestamp, mounted, visible, note, topLevelCount: req.body?.topLevelCount });

    if (req.body?.topLevel) {
      console.error('[CLIENT LOG] topLevel sample:', JSON.stringify(req.body.topLevel));
    }

    if (domSnapshot) {
      // Avoid logging huge snapshots in prod; log length instead
      console.error('[CLIENT LOG] domSnapshot length:', String(domSnapshot).length);
    }

    // TODO: Optionally persist to Firestore or forward to external logging service

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Failed to process client log', err);
    res.status(500).json({ ok: false, message: String(err) });
  }
}
