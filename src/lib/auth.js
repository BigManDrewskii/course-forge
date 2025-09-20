/**
 * Authentication and session management for CourseForge
 * Provides secure user authentication and session handling
 */

import { generateToken, generateJWT, verifyJWT, hashPassword, verifyPassword } from './encryption.js';
import { userQueries, sessionQueries } from './database.js';

/**
 * Authentication service
 */
export class AuthService {
  constructor() {
    this.sessionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  }

  /**
   * Create a new user account
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user and session
   */
  async register(userData) {
    const { email, name, password, avatar_url } = userData;
    
    // Check if user already exists
    const existingUser = await userQueries.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Hash password if provided (for future password auth)
    const hashedPassword = password ? await hashPassword(password) : null;
    
    // Create user
    const user = await userQueries.create({
      email,
      name,
      avatar_url,
      preferences: {
        hashedPassword // Store securely in preferences for now
      }
    });
    
    // Create session
    const session = await this.createSession(user, userData.userAgent, userData.ipAddress);
    
    return {
      user: this.sanitizeUser(user),
      session
    };
  }

  /**
   * Authenticate user with email and password
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} User and session
   */
  async login(credentials) {
    const { email, password, userAgent, ipAddress } = credentials;
    
    // Find user
    const user = await userQueries.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Verify password if provided
    if (password && user.preferences?.hashedPassword) {
      const isValid = await verifyPassword(password, user.preferences.hashedPassword);
      if (!isValid) {
        throw new Error('Invalid email or password');
      }
    }
    
    // Update last login
    await userQueries.updateLastLogin(user.id);
    
    // Create session
    const session = await this.createSession(user, userAgent, ipAddress);
    
    return {
      user: this.sanitizeUser(user),
      session
    };
  }

  /**
   * Create a new session for a user
   * @param {Object} user - User object
   * @param {string} userAgent - User agent string
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Session data
   */
  async createSession(user, userAgent, ipAddress) {
    const sessionToken = generateToken(32);
    const expiresAt = new Date(Date.now() + this.sessionDuration);
    
    const session = await sessionQueries.create({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt,
      user_agent: userAgent,
      ip_address: ipAddress
    });
    
    // Generate JWT for client
    const jwt = generateJWT({
      userId: user.id,
      sessionId: session.id,
      email: user.email
    });
    
    return {
      token: jwt,
      sessionToken,
      expiresAt,
      user: this.sanitizeUser(user)
    };
  }

  /**
   * Validate a session token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} User and session data
   */
  async validateSession(token) {
    try {
      // Verify JWT
      const payload = verifyJWT(token);
      
      // Find session in database
      const sessionData = await sessionQueries.findByToken(payload.sessionToken || '');
      
      if (!sessionData) {
        throw new Error('Session not found or expired');
      }
      
      return {
        user: this.sanitizeUser(sessionData),
        session: {
          id: sessionData.id,
          expiresAt: sessionData.expires_at
        }
      };
    } catch (error) {
      throw new Error('Invalid or expired session');
    }
  }

  /**
   * Logout user and invalidate session
   * @param {string} token - JWT token
   * @returns {Promise<void>}
   */
  async logout(token) {
    try {
      const payload = verifyJWT(token);
      await sessionQueries.delete(payload.sessionToken);
    } catch (error) {
      // Silent fail for logout
      console.warn('Logout error:', error.message);
    }
  }

  /**
   * Clean up expired sessions
   * @returns {Promise<number>} Number of sessions cleaned up
   */
  async cleanupExpiredSessions() {
    return sessionQueries.cleanupExpired();
  }

  /**
   * Remove sensitive data from user object
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    const { preferences, ...sanitized } = user;
    
    // Remove sensitive data from preferences
    const { hashedPassword, ...safePreferences } = preferences || {};
    
    return {
      ...sanitized,
      preferences: safePreferences
    };
  }
}

/**
 * Authentication middleware for API routes
 * @param {Function} handler - API route handler
 * @returns {Function} Wrapped handler with authentication
 */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      // Get token from Authorization header or cookie
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.slice(7)
        : req.cookies?.auth_token;
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate session
      const authService = new AuthService();
      const { user, session } = await authService.validateSession(token);
      
      // Add user and session to request
      req.user = user;
      req.session = session;
      
      // Call the original handler
      return handler(req, res);
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  };
}

/**
 * Optional authentication middleware (doesn't fail if no auth)
 * @param {Function} handler - API route handler
 * @returns {Function} Wrapped handler with optional authentication
 */
export function withOptionalAuth(handler) {
  return async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.slice(7)
        : req.cookies?.auth_token;
      
      if (token) {
        const authService = new AuthService();
        const { user, session } = await authService.validateSession(token);
        req.user = user;
        req.session = session;
      }
    } catch (error) {
      // Silent fail for optional auth
      console.warn('Optional auth failed:', error.message);
    }
    
    return handler(req, res);
  };
}

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @returns {Function} Rate limiting middleware
 */
export function withRateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    keyGenerator = (req) => req.ip || 'unknown'
  } = options;
  
  const requests = new Map();
  
  return (handler) => {
    return async (req, res) => {
      const key = keyGenerator(req);
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean up old entries
      if (requests.has(key)) {
        const userRequests = requests.get(key).filter(time => time > windowStart);
        requests.set(key, userRequests);
      }
      
      // Check rate limit
      const userRequests = requests.get(key) || [];
      if (userRequests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
        });
      }
      
      // Add current request
      userRequests.push(now);
      requests.set(key, userRequests);
      
      return handler(req, res);
    };
  };
}

/**
 * CORS middleware
 * @param {Object} options - CORS options
 * @returns {Function} CORS middleware
 */
export function withCORS(options = {}) {
  const {
    origin = process.env.FRONTEND_URL || 'http://localhost:5173',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = true
  } = options;
  
  return (handler) => {
    return async (req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.setHeader('Access-Control-Allow-Credentials', credentials);
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      return handler(req, res);
    };
  };
}

/**
 * Error handling middleware
 * @param {Function} handler - API route handler
 * @returns {Function} Wrapped handler with error handling
 */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      
      // Don't expose internal errors in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      const message = isDevelopment ? error.message : 'Internal server error';
      
      return res.status(500).json({
        error: message,
        ...(isDevelopment && { stack: error.stack })
      });
    }
  };
}

/**
 * Compose multiple middleware functions
 * @param {...Function} middlewares - Middleware functions
 * @returns {Function} Composed middleware
 */
export function compose(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight((acc, middleware) => {
      return middleware(acc);
    }, handler);
  };
}

// Create singleton auth service instance
export const authService = new AuthService();
