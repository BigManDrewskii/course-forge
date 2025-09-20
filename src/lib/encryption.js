/**
 * Encryption utilities for secure API key storage
 * Uses AES-256-GCM for authenticated encryption
 */

import CryptoJS from 'crypto-js';

// Get encryption key from environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-for-development-only';

if (process.env.NODE_ENV === 'production' && ENCRYPTION_KEY === 'default-key-for-development-only') {
  throw new Error('ENCRYPTION_KEY environment variable must be set in production');
}

/**
 * Encrypt a string using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text with IV and auth tag
 */
export function encrypt(text) {
  try {
    // Generate a random IV for each encryption
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Encrypt the text
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY, {
      iv: iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding
    });
    
    // Combine IV and encrypted data
    const combined = iv.concat(encrypted.ciphertext);
    
    // Return base64 encoded result
    return CryptoJS.enc.Base64.stringify(combined);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string using AES-256-GCM
 * @param {string} encryptedText - Base64 encoded encrypted text
 * @returns {string} Decrypted text
 */
export function decrypt(encryptedText) {
  try {
    // Parse the base64 encoded data
    const combined = CryptoJS.enc.Base64.parse(encryptedText);
    
    // Extract IV (first 16 bytes) and ciphertext
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      ENCRYPTION_KEY,
      {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
      }
    );
    
    // Convert to UTF-8 string
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  const bcrypt = await import('bcryptjs');
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Random token as hex string
 */
export function generateToken(length = 32) {
  return CryptoJS.lib.WordArray.random(length).toString();
}

/**
 * Generate a JWT token
 * @param {Object} payload - Token payload
 * @param {string} secret - JWT secret
 * @param {Object} options - JWT options
 * @returns {string} JWT token
 */
export function generateJWT(payload, secret = process.env.JWT_SECRET, options = {}) {
  const jwt = require('jsonwebtoken');
  
  const defaultOptions = {
    expiresIn: '7d',
    issuer: 'courseforge',
    ...options
  };
  
  return jwt.sign(payload, secret, defaultOptions);
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token
 * @param {string} secret - JWT secret
 * @returns {Object} Decoded payload
 */
export function verifyJWT(token, secret = process.env.JWT_SECRET) {
  const jwt = require('jsonwebtoken');
  
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Mask sensitive data for logging
 * @param {string} data - Sensitive data
 * @param {number} visibleChars - Number of characters to show (default: 4)
 * @returns {string} Masked data
 */
export function maskSensitiveData(data, visibleChars = 4) {
  if (!data || data.length <= visibleChars) {
    return '*'.repeat(data?.length || 0);
  }
  
  const visible = data.slice(0, visibleChars);
  const masked = '*'.repeat(data.length - visibleChars);
  return visible + masked;
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @param {string} provider - Provider ('openai' or 'anthropic')
 * @returns {boolean} True if format is valid
 */
export function validateApiKeyFormat(apiKey, provider) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  switch (provider) {
    case 'openai':
      // OpenAI keys start with 'sk-' and are typically 51 characters
      return /^sk-[a-zA-Z0-9]{48}$/.test(apiKey);
    
    case 'anthropic':
      // Anthropic keys start with 'sk-ant-' and are longer
      return /^sk-ant-[a-zA-Z0-9-_]{95,}$/.test(apiKey);
    
    default:
      return false;
  }
}

/**
 * Secure comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
export function secureCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
