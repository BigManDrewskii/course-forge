/**
 * Security Middleware and Validation
 * Comprehensive security measures for CourseForge
 */

import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

/**
 * Security Configuration
 */
export const SECURITY_CONFIG = {
  // Rate limiting
  rateLimits: {
    general: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
    auth: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 auth attempts per 15 minutes
    ai: { windowMs: 5 * 60 * 1000, max: 20 }, // 20 AI requests per 5 minutes
    export: { windowMs: 10 * 60 * 1000, max: 5 }, // 5 exports per 10 minutes
    byok: { windowMs: 15 * 60 * 1000, max: 10 } // 10 BYOK operations per 15 minutes
  },
  
  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://api.openai.com",
        "https://api.anthropic.com",
        "https://generativelanguage.googleapis.com"
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  
  // Input validation
  validation: {
    maxTextLength: 50000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['md', 'txt', 'pdf', 'docx', 'html', 'json'],
    maxApiKeyLength: 200,
    maxUsernameLength: 50,
    maxEmailLength: 254
  },
  
  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16
  }
};

/**
 * Input Sanitization and Validation
 */
export class InputValidator {
  /**
   * Sanitize text input
   */
  static sanitizeText(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .slice(0, SECURITY_CONFIG.validation.maxTextLength);
  }

  /**
   * Validate email format
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= SECURITY_CONFIG.validation.maxEmailLength;
  }

  /**
   * Validate API key format
   */
  static validateApiKey(provider, key) {
    if (!key || typeof key !== 'string') return false;
    if (key.length > SECURITY_CONFIG.validation.maxApiKeyLength) return false;

    const patterns = {
      openai: /^sk-(proj-)?[a-zA-Z0-9]{20,}$/,
      anthropic: /^sk-ant-api03-[a-zA-Z0-9_-]{95}$/,
      google: /^AIza[a-zA-Z0-9_-]{35}$/
    };

    return patterns[provider]?.test(key) || false;
  }

  /**
   * Validate course content
   */
  static validateCourseContent(content) {
    if (!content || typeof content !== 'object') {
      throw new Error('Invalid content format');
    }

    const { title, description, sections } = content;

    // Validate title
    if (!title || typeof title !== 'string' || title.length > 200) {
      throw new Error('Invalid course title');
    }

    // Validate description
    if (description && (typeof description !== 'string' || description.length > 1000)) {
      throw new Error('Invalid course description');
    }

    // Validate sections
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new Error('Course must have at least one section');
    }

    sections.forEach((section, index) => {
      if (!section.title || typeof section.title !== 'string') {
        throw new Error(`Invalid title for section ${index + 1}`);
      }
      
      if (!section.content || typeof section.content !== 'string') {
        throw new Error(`Invalid content for section ${index + 1}`);
      }
      
      if (section.content.length > SECURITY_CONFIG.validation.maxTextLength) {
        throw new Error(`Section ${index + 1} content too long`);
      }
    });

    return true;
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file) {
    if (!file) throw new Error('No file provided');
    
    // Check file size
    if (file.size > SECURITY_CONFIG.validation.maxFileSize) {
      throw new Error('File too large');
    }
    
    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!SECURITY_CONFIG.validation.allowedFileTypes.includes(extension)) {
      throw new Error('File type not allowed');
    }
    
    return true;
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 100);
  }
}

/**
 * Encryption Utilities
 */
export class EncryptionManager {
  constructor() {
    this.algorithm = SECURITY_CONFIG.encryption.algorithm;
    this.keyLength = SECURITY_CONFIG.encryption.keyLength;
    this.ivLength = SECURITY_CONFIG.encryption.ivLength;
  }

  /**
   * Generate encryption key
   */
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Encrypt data
   */
  encrypt(data, key) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData, key) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      
      const decipher = crypto.createDecipher(
        this.algorithm,
        key,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password, saltRounds = 12) {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken() {
    return crypto.randomBytes(32).toString('base64');
  }
}

/**
 * Rate Limiting Middleware
 */
export function createRateLimit(type = 'general') {
  const config = SECURITY_CONFIG.rateLimits[type] || SECURITY_CONFIG.rateLimits.general;
  
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      error: 'Too many requests',
      retryAfter: Math.ceil(config.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(config.windowMs / 1000),
        type
      });
    }
  });
}

/**
 * Security Headers Middleware
 */
export function securityHeaders(req, res, next) {
  // Content Security Policy
  const cspDirectives = Object.entries(SECURITY_CONFIG.csp.directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
  
  res.setHeader('Content-Security-Policy', cspDirectives);
  
  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}

/**
 * CSRF Protection Middleware
 */
export function csrfProtection(req, res, next) {
  // Skip CSRF for GET requests and API endpoints with proper authentication
  if (req.method === 'GET' || req.path.startsWith('/api/auth/')) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  next();
}

/**
 * Input Validation Middleware
 */
export function validateInput(schema) {
  return (req, res, next) => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = validateSchema(req.body, schema.body);
      }
      
      // Validate query parameters
      if (schema.query) {
        req.query = validateSchema(req.query, schema.query);
      }
      
      // Validate URL parameters
      if (schema.params) {
        req.params = validateSchema(req.params, schema.params);
      }
      
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.message
      });
    }
  };
}

/**
 * Schema validation helper
 */
function validateSchema(data, schema) {
  const validated = {};
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      throw new Error(`${key} is required`);
    }
    
    // Skip validation if field is optional and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Type validation
    if (rules.type && typeof value !== rules.type) {
      throw new Error(`${key} must be of type ${rules.type}`);
    }
    
    // Length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      throw new Error(`${key} exceeds maximum length of ${rules.maxLength}`);
    }
    
    if (rules.minLength && value.length < rules.minLength) {
      throw new Error(`${key} is below minimum length of ${rules.minLength}`);
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      throw new Error(`${key} format is invalid`);
    }
    
    // Custom validation
    if (rules.validate && !rules.validate(value)) {
      throw new Error(`${key} validation failed`);
    }
    
    // Sanitization
    validated[key] = rules.sanitize ? rules.sanitize(value) : value;
  }
  
  return validated;
}

/**
 * Audit Logging
 */
export class AuditLogger {
  static async log(event, userId, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      userId,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      sessionId: metadata.sessionId,
      details: metadata.details || {}
    };
    
    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      try {
        await this.sendToLoggingService(logEntry);
      } catch (error) {
        console.error('Failed to send audit log:', error);
      }
    } else {
      console.log('🔍 Audit Log:', logEntry);
    }
  }
  
  static async sendToLoggingService(logEntry) {
    // Implementation would depend on your logging service
    // Examples: CloudWatch, Datadog, Splunk, etc.
  }
}

/**
 * Security utilities
 */
export const securityUtils = {
  /**
   * Generate secure random string
   */
  generateSecureId(length = 16) {
    return crypto.randomBytes(length).toString('hex');
  },
  
  /**
   * Constant-time string comparison
   */
  constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  },
  
  /**
   * Check if request is from allowed origin
   */
  isAllowedOrigin(origin) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://courseforge.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    return allowedOrigins.includes(origin);
  },
  
  /**
   * Extract IP address from request
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'unknown';
  }
};

export default {
  InputValidator,
  EncryptionManager,
  createRateLimit,
  securityHeaders,
  csrfProtection,
  validateInput,
  AuditLogger,
  securityUtils,
  SECURITY_CONFIG
};
