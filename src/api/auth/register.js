/**
 * Registration API endpoint
 * POST /api/auth/register
 */

import { authService } from '../../lib/auth.js';
import { withErrorHandling, withCORS, withRateLimit } from '../../lib/auth.js';

async function registerHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, password, avatar_url } = req.body;

  // Validate input
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Get client info
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    // Register user
    const result = await authService.register({
      email,
      name,
      password,
      avatar_url,
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

    return res.status(201).json({
      success: true,
      user: result.user,
      session: {
        expiresAt: result.session.expiresAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    return res.status(400).json({ error: error.message });
  }
}

// Apply middleware
export default withErrorHandling(
  withCORS()(
    withRateLimit({ maxRequests: 3, windowMs: 15 * 60 * 1000 })(
      registerHandler
    )
  )
);
