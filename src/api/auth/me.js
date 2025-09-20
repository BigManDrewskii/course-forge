/**
 * Current user API endpoint
 * GET /api/auth/me
 */

import { withAuth, withErrorHandling, withCORS } from '../../lib/auth.js';

async function meHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // User is already validated by withAuth middleware
  return res.status(200).json({
    success: true,
    user: req.user,
    session: {
      id: req.session.id,
      expiresAt: req.session.expiresAt
    }
  });
}

// Apply middleware
export default withErrorHandling(
  withCORS()(
    withAuth(
      meHandler
    )
  )
);
