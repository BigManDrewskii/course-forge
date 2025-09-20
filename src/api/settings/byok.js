/**
 * BYOK (Bring Your Own Key) API Endpoints
 * Secure API key management with encryption and validation
 */

import { BYOKManager } from '../../lib/byok-manager.js';
import { validateSession } from '../../lib/auth.js';
import { rateLimit } from '../../lib/middleware.js';

const byokManager = new BYOKManager();

/**
 * Rate limiting configuration
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: 'Too many BYOK requests, please try again later'
});

/**
 * GET /api/settings/byok
 * Retrieve user's encrypted API keys (masked for display)
 */
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    // Validate session
    const session = await validateSession(request);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Retrieve masked API keys
    const keys = await byokManager.getUserApiKeys(session.userId);
    const maskedKeys = {};

    for (const [provider, encryptedKey] of Object.entries(keys)) {
      if (encryptedKey) {
        // Decrypt and mask for display
        const decryptedKey = await byokManager.decryptApiKey(encryptedKey);
        maskedKeys[provider] = byokManager.maskApiKey(decryptedKey);
      }
    }

    return new Response(JSON.stringify({
      keys: maskedKeys,
      providers: Object.keys(keys),
      lastUpdated: keys.lastUpdated
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('BYOK GET error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to retrieve API keys' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/settings/byok
 * Store user's API keys with encryption
 */
export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    // Validate session
    const session = await validateSession(request);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { keys } = await request.json();
    
    if (!keys || typeof keys !== 'object') {
      return new Response(JSON.stringify({ 
        error: 'Invalid request body' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate and encrypt API keys
    const encryptedKeys = {};
    const validationResults = {};

    for (const [provider, apiKey] of Object.entries(keys)) {
      if (!apiKey) {
        // Remove key if empty
        encryptedKeys[provider] = null;
        continue;
      }

      // Validate key format
      const isValidFormat = byokManager.validateKeyFormat(provider, apiKey);
      if (!isValidFormat) {
        return new Response(JSON.stringify({ 
          error: `Invalid API key format for ${provider}`,
          provider 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Encrypt and store
      try {
        encryptedKeys[provider] = await byokManager.encryptApiKey(apiKey);
        validationResults[provider] = { encrypted: true };
      } catch (error) {
        console.error(`Encryption failed for ${provider}:`, error);
        return new Response(JSON.stringify({ 
          error: `Failed to encrypt API key for ${provider}` 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Store encrypted keys
    await byokManager.storeUserApiKeys(session.userId, encryptedKeys);

    // Log audit event
    await byokManager.logAuditEvent(session.userId, 'api_keys_updated', {
      providers: Object.keys(encryptedKeys).filter(p => encryptedKeys[p]),
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return new Response(JSON.stringify({
      success: true,
      providers: Object.keys(encryptedKeys).filter(p => encryptedKeys[p]),
      validationResults
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('BYOK POST error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to store API keys' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * DELETE /api/settings/byok
 * Remove all user API keys
 */
export async function DELETE(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    // Validate session
    const session = await validateSession(request);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Remove all API keys
    await byokManager.removeUserApiKeys(session.userId);

    // Log audit event
    await byokManager.logAuditEvent(session.userId, 'api_keys_removed', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'All API keys removed successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('BYOK DELETE error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to remove API keys' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
