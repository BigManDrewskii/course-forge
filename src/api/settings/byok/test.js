/**
 * BYOK API Key Testing Endpoint
 * Validates API key functionality without storing
 */

import { BYOKManager } from '../../../lib/byok-manager.js';
import { validateSession } from '../../../lib/auth.js';
import { rateLimit } from '../../../lib/middleware.js';

const byokManager = new BYOKManager();

/**
 * Rate limiting for API key testing
 */
const rateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 tests per window
  message: 'Too many API key test requests, please try again later'
});

/**
 * POST /api/settings/byok/test
 * Test API key functionality
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
    const { provider, apiKey } = await request.json();
    
    if (!provider || !apiKey) {
      return new Response(JSON.stringify({ 
        error: 'Provider and API key are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate key format first
    const isValidFormat = byokManager.validateKeyFormat(provider, apiKey);
    if (!isValidFormat) {
      return new Response(JSON.stringify({ 
        valid: false,
        error: 'Invalid API key format',
        details: `Expected format: ${byokManager.getKeyFormat(provider)}`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Test API key functionality
    const testResult = await byokManager.testApiKey(provider, apiKey);

    if (testResult.valid) {
      // Log successful test (without storing the key)
      await byokManager.logAuditEvent(session.userId, 'api_key_tested', {
        provider,
        success: true,
        models: testResult.models?.length || 0,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return new Response(JSON.stringify({
        valid: true,
        provider,
        models: testResult.models,
        quota: testResult.quota,
        capabilities: testResult.capabilities,
        message: 'API key is valid and functional'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Log failed test
      await byokManager.logAuditEvent(session.userId, 'api_key_tested', {
        provider,
        success: false,
        error: testResult.error,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return new Response(JSON.stringify({
        valid: false,
        provider,
        error: testResult.error,
        details: testResult.details,
        suggestions: testResult.suggestions
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('BYOK test error:', error);
    
    // Log error
    try {
      const session = await validateSession(request);
      if (session) {
        await byokManager.logAuditEvent(session.userId, 'api_key_test_error', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    } catch (logError) {
      console.error('Failed to log audit event:', logError);
    }

    return new Response(JSON.stringify({ 
      valid: false,
      error: 'API key test failed',
      details: 'An unexpected error occurred during testing'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/settings/byok/test/providers
 * Get available providers and their requirements
 */
export async function GET(request) {
  try {
    // Validate session
    const session = await validateSession(request);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const providers = byokManager.getSupportedProviders();

    return new Response(JSON.stringify({
      providers,
      requirements: {
        openai: {
          keyFormat: 'sk-proj-... or sk-...',
          minLength: 20,
          testEndpoint: 'models',
          documentation: 'https://platform.openai.com/api-keys'
        },
        anthropic: {
          keyFormat: 'sk-ant-api03-...',
          minLength: 95,
          testEndpoint: 'messages',
          documentation: 'https://console.anthropic.com/settings/keys'
        },
        google: {
          keyFormat: 'AIza...',
          minLength: 39,
          testEndpoint: 'models',
          documentation: 'https://aistudio.google.com/app/apikey'
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('BYOK providers GET error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to retrieve provider information' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
