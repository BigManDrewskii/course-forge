/**
 * Logout API endpoint
 * POST /api/auth/logout
 */

import { authService } from '../../lib/auth.js';
import { withErrorHandling, withCORS } from '../../lib/auth.js';

async function logoutHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7)
      : req.cookies?.auth_token;

    if (token) {
      // Invalidate session
      await authService.logout(token);
    }

    // Clear cookie
    res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still return success even if logout fails
    // (user might have invalid token)
    res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}

// Apply middleware
export default withErrorHandling(
  withCORS()(
    logoutHandler
  )
);
