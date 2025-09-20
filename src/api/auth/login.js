/**
 * Login API endpoint
 * POST /api/auth/login
 */

import { authService } from '../../lib/auth.js';
import { withErrorHandling, withCORS, withRateLimit } from '../../lib/auth.js';

async function loginHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  // Validate input
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Get client info
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    // Authenticate user
    const result = await authService.login({
      email,
      password,
      userAgent,
      ipAddress
    });

    // Set secure cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    };

    res.setHeader('Set-Cookie', `auth_token=${result.session.token}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);

    return res.status(200).json({
      success: true,
      user: result.user,
      session: {
        expiresAt: result.session.expiresAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({ error: error.message });
  }
}

// Apply middleware
export default withErrorHandling(
  withCORS()(
    withRateLimit({ maxRequests: 5, windowMs: 15 * 60 * 1000 })(
      loginHandler
    )
  )
);
