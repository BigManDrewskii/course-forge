/**
 * Bring Your Own Key (BYOK) Management System
 * Handles secure storage and management of user-provided API keys
 */

import { encrypt, decrypt } from './encryption.js';
import { apiKeyQueries } from './database.js';

/**
 * BYOK Configuration
 */
const BYOK_CONFIG = {
  supportedProviders: {
    openai: {
      name: 'OpenAI',
      keyFormat: /^sk-[a-zA-Z0-9]{48,}$/,
      testEndpoint: 'https://api.openai.com/v1/models',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      documentation: 'https://platform.openai.com/api-keys'
    },
    anthropic: {
      name: 'Anthropic',
      keyFormat: /^sk-ant-[a-zA-Z0-9-_]{95,}$/,
      testEndpoint: 'https://api.anthropic.com/v1/messages',
      models: ['claude-3-5-sonnet', 'claude-3-haiku'],
      documentation: 'https://console.anthropic.com/account/keys'
    }
  },
  
  security: {
    encryptionAlgorithm: 'aes-256-gcm',
    keyRotationDays: 90,
    maxFailedAttempts: 3,
    lockoutDuration: 300000 // 5 minutes
  },
  
  validation: {
    testTimeout: 10000, // 10 seconds
    retryAttempts: 2,
    healthCheckInterval: 3600000 // 1 hour
  }
};

/**
 * BYOK Manager Class
 */
export class BYOKManager {
  constructor() {
    this.config = BYOK_CONFIG;
    this.keyCache = new Map(); // Temporary cache for validated keys
    this.healthStatus = new Map(); // Track key health
  }

  /**
   * Add user API key
   */
  async addApiKey(userId, provider, apiKey, options = {}) {
    const { alias = null, setAsDefault = false, skipValidation = false } = options;

    // Validate provider
    if (!this.config.supportedProviders[provider]) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Validate key format
    if (!this.validateKeyFormat(provider, apiKey)) {
      throw new Error(`Invalid API key format for ${provider}`);
    }

    // Test key functionality (unless skipped)
    if (!skipValidation) {
      const testResult = await this.testApiKey(provider, apiKey);
      if (!testResult.valid) {
        throw new Error(`API key validation failed: ${testResult.error}`);
      }
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);

    // Store in database
    const keyRecord = await apiKeyQueries.create({
      user_id: userId,
      provider,
      encrypted_key: encryptedKey,
      alias: alias || `${this.config.supportedProviders[provider].name} Key`,
      is_default: setAsDefault,
      status: 'active',
      last_validated: new Date(),
      metadata: {
        created_via: 'byok_manager',
        key_prefix: this.maskApiKey(apiKey),
        validation_passed: !skipValidation
      }
    });

    // Set as default if requested or if it's the first key for this provider
    if (setAsDefault) {
      await this.setDefaultKey(userId, provider, keyRecord.id);
    }

    // Cache the key temporarily
    this.cacheKey(userId, provider, keyRecord.id, apiKey);

    return {
      id: keyRecord.id,
      provider,
      alias: keyRecord.alias,
      masked_key: this.maskApiKey(apiKey),
      is_default: keyRecord.is_default,
      status: keyRecord.status
    };
  }

  /**
   * Get user's API keys
   */
  async getUserApiKeys(userId, provider = null) {
    const keys = await apiKeyQueries.findByUserId(userId, provider);
    
    return keys.map(key => ({
      id: key.id,
      provider: key.provider,
      alias: key.alias,
      masked_key: key.metadata?.key_prefix || this.maskApiKey(''),
      is_default: key.is_default,
      status: key.status,
      last_validated: key.last_validated,
      created_at: key.created_at
    }));
  }

  /**
   * Get decrypted API key for use
   */
  async getApiKey(userId, provider, keyId = null) {
    // Try cache first
    const cacheKey = `${userId}:${provider}:${keyId || 'default'}`;
    if (this.keyCache.has(cacheKey)) {
      const cached = this.keyCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
        return cached.key;
      }
    }

    // Get from database
    let keyRecord;
    if (keyId) {
      keyRecord = await apiKeyQueries.findById(keyId, userId);
    } else {
      keyRecord = await apiKeyQueries.findDefaultByProvider(userId, provider);
    }

    if (!keyRecord) {
      throw new Error(`No API key found for ${provider}`);
    }

    if (keyRecord.status !== 'active') {
      throw new Error(`API key is ${keyRecord.status}`);
    }

    // Decrypt the key
    const decryptedKey = decrypt(keyRecord.encrypted_key);

    // Cache for future use
    this.cacheKey(userId, provider, keyRecord.id, decryptedKey);

    return decryptedKey;
  }

  /**
   * Test API key functionality
   */
  async testApiKey(provider, apiKey) {
    const providerConfig = this.config.supportedProviders[provider];
    
    try {
      const testResult = await this.performProviderTest(provider, apiKey, providerConfig);
      
      return {
        valid: true,
        provider,
        models: testResult.models || [],
        quota: testResult.quota || null,
        response_time: testResult.responseTime || null
      };
      
    } catch (error) {
      return {
        valid: false,
        provider,
        error: error.message,
        error_code: error.code || 'UNKNOWN'
      };
    }
  }

  /**
   * Perform provider-specific API test
   */
  async performProviderTest(provider, apiKey, config) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.validation.testTimeout);

    try {
      const startTime = Date.now();
      
      let response;
      
      if (provider === 'openai') {
        response = await fetch(config.testEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
      } else if (provider === 'anthropic') {
        // Anthropic requires a different test approach
        response = await fetch(config.testEndpoint, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          }),
          signal: controller.signal
        });
      }

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      return {
        models: this.extractModels(provider, data),
        quota: this.extractQuota(provider, response.headers),
        responseTime
      };

    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Extract available models from API response
   */
  extractModels(provider, data) {
    if (provider === 'openai' && data.data) {
      return data.data
        .filter(model => this.config.supportedProviders[provider].models.includes(model.id))
        .map(model => model.id);
    }
    
    // For Anthropic, return configured models since test endpoint doesn't list them
    return this.config.supportedProviders[provider].models;
  }

  /**
   * Extract quota information from response headers
   */
  extractQuota(provider, headers) {
    const quota = {};
    
    if (provider === 'openai') {
      quota.requests_remaining = headers.get('x-ratelimit-remaining-requests');
      quota.tokens_remaining = headers.get('x-ratelimit-remaining-tokens');
    } else if (provider === 'anthropic') {
      quota.requests_remaining = headers.get('anthropic-ratelimit-requests-remaining');
      quota.tokens_remaining = headers.get('anthropic-ratelimit-tokens-remaining');
    }
    
    return quota;
  }

  /**
   * Validate API key format
   */
  validateKeyFormat(provider, apiKey) {
    const providerConfig = this.config.supportedProviders[provider];
    return providerConfig.keyFormat.test(apiKey);
  }

  /**
   * Mask API key for display
   */
  maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) return '••••••••';
    
    const prefix = apiKey.substring(0, 8);
    const suffix = apiKey.substring(apiKey.length - 4);
    
    return `${prefix}••••••••${suffix}`;
  }

  /**
   * Set default API key for provider
   */
  async setDefaultKey(userId, provider, keyId) {
    // Remove default flag from other keys
    await apiKeyQueries.clearDefaultForProvider(userId, provider);
    
    // Set new default
    await apiKeyQueries.setDefault(keyId, userId);
  }

  /**
   * Delete API key
   */
  async deleteApiKey(userId, keyId) {
    const keyRecord = await apiKeyQueries.findById(keyId, userId);
    
    if (!keyRecord) {
      throw new Error('API key not found');
    }

    // Remove from cache
    this.removeCachedKey(userId, keyRecord.provider, keyId);

    // Delete from database
    await apiKeyQueries.delete(keyId, userId);

    return true;
  }

  /**
   * Update API key
   */
  async updateApiKey(userId, keyId, updates) {
    const { alias, status } = updates;
    
    const keyRecord = await apiKeyQueries.findById(keyId, userId);
    if (!keyRecord) {
      throw new Error('API key not found');
    }

    const updatedKey = await apiKeyQueries.update(keyId, {
      alias: alias || keyRecord.alias,
      status: status || keyRecord.status
    }, userId);

    // Clear cache if status changed
    if (status && status !== keyRecord.status) {
      this.removeCachedKey(userId, keyRecord.provider, keyId);
    }

    return {
      id: updatedKey.id,
      provider: updatedKey.provider,
      alias: updatedKey.alias,
      status: updatedKey.status
    };
  }

  /**
   * Validate all user keys (health check)
   */
  async validateUserKeys(userId) {
    const keys = await apiKeyQueries.findByUserId(userId);
    const results = [];

    for (const keyRecord of keys) {
      if (keyRecord.status !== 'active') {
        results.push({
          id: keyRecord.id,
          provider: keyRecord.provider,
          status: 'skipped',
          reason: `Key is ${keyRecord.status}`
        });
        continue;
      }

      try {
        const decryptedKey = decrypt(keyRecord.encrypted_key);
        const testResult = await this.testApiKey(keyRecord.provider, decryptedKey);

        if (testResult.valid) {
          // Update last validated timestamp
          await apiKeyQueries.updateLastValidated(keyRecord.id);
          
          results.push({
            id: keyRecord.id,
            provider: keyRecord.provider,
            status: 'valid',
            models: testResult.models,
            response_time: testResult.response_time
          });
        } else {
          results.push({
            id: keyRecord.id,
            provider: keyRecord.provider,
            status: 'invalid',
            error: testResult.error
          });
        }

      } catch (error) {
        results.push({
          id: keyRecord.id,
          provider: keyRecord.provider,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Cache API key temporarily
   */
  cacheKey(userId, provider, keyId, apiKey) {
    const cacheKey = `${userId}:${provider}:${keyId}`;
    this.keyCache.set(cacheKey, {
      key: apiKey,
      timestamp: Date.now()
    });

    // Also cache as default if it's the default key
    const defaultCacheKey = `${userId}:${provider}:default`;
    this.keyCache.set(defaultCacheKey, {
      key: apiKey,
      timestamp: Date.now()
    });
  }

  /**
   * Remove cached key
   */
  removeCachedKey(userId, provider, keyId) {
    const cacheKey = `${userId}:${provider}:${keyId}`;
    this.keyCache.delete(cacheKey);
    
    const defaultCacheKey = `${userId}:${provider}:default`;
    this.keyCache.delete(defaultCacheKey);
  }

  /**
   * Clear all cached keys for user
   */
  clearUserCache(userId) {
    for (const [key] of this.keyCache.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.keyCache.delete(key);
      }
    }
  }

  /**
   * Get BYOK statistics for user
   */
  async getBYOKStats(userId) {
    const keys = await apiKeyQueries.findByUserId(userId);
    
    const stats = {
      total_keys: keys.length,
      active_keys: keys.filter(k => k.status === 'active').length,
      providers: {},
      last_validation: null
    };

    for (const key of keys) {
      if (!stats.providers[key.provider]) {
        stats.providers[key.provider] = {
          count: 0,
          active: 0,
          default_set: false
        };
      }
      
      stats.providers[key.provider].count++;
      
      if (key.status === 'active') {
        stats.providers[key.provider].active++;
      }
      
      if (key.is_default) {
        stats.providers[key.provider].default_set = true;
      }
      
      if (!stats.last_validation || key.last_validated > stats.last_validation) {
        stats.last_validation = key.last_validated;
      }
    }

    return stats;
  }

  /**
   * Get supported providers information
   */
  getSupportedProviders() {
    return Object.entries(this.config.supportedProviders).map(([id, config]) => ({
      id,
      name: config.name,
      models: config.models,
      documentation: config.documentation,
      key_format_hint: this.getKeyFormatHint(id)
    }));
  }

  /**
   * Get key format hint for UI
   */
  getKeyFormatHint(provider) {
    const hints = {
      openai: 'Starts with "sk-" followed by 48+ characters',
      anthropic: 'Starts with "sk-ant-" followed by 95+ characters'
    };
    
    return hints[provider] || 'Check provider documentation for format';
  }
}

/**
 * BYOK Integration with AI Provider Manager
 */
export class BYOKIntegration {
  constructor(byokManager, aiProviderManager) {
    this.byokManager = byokManager;
    this.aiProviderManager = aiProviderManager;
  }

  /**
   * Generate content using user's API keys
   */
  async generateWithUserKeys(userId, prompt, requirements = {}) {
    const { provider, model } = requirements;
    
    try {
      // Get user's API key for the provider
      const apiKey = await this.byokManager.getApiKey(userId, provider);
      
      // Create temporary provider instance with user's key
      const userProvider = this.createUserProvider(provider, model, apiKey);
      
      // Generate content
      const result = await this.executeWithUserProvider(userProvider, prompt, requirements);
      
      return {
        ...result,
        byok: true,
        provider,
        model,
        cost: 0 // User pays directly to provider
      };
      
    } catch (error) {
      // Fallback to platform keys if user keys fail
      if (requirements.allowFallback) {
        return this.aiProviderManager.generateWithOptimalProvider(prompt, {
          ...requirements,
          byok: false
        });
      }
      
      throw error;
    }
  }

  /**
   * Create provider instance with user's API key
   */
  createUserProvider(provider, model, apiKey) {
    if (provider === 'openai') {
      const { openai } = require('@ai-sdk/openai');
      return openai(model, { apiKey });
    } else if (provider === 'anthropic') {
      const { anthropic } = require('@ai-sdk/anthropic');
      return anthropic(model, { apiKey });
    }
    
    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Execute generation with user provider
   */
  async executeWithUserProvider(provider, prompt, requirements) {
    const { stream = false, maxTokens = 4000, temperature = 0.7 } = requirements;
    
    if (stream) {
      const { streamText } = require('ai');
      return await streamText({
        model: provider,
        prompt,
        maxTokens,
        temperature
      });
    } else {
      const { generateText } = require('ai');
      return await generateText({
        model: provider,
        prompt,
        maxTokens,
        temperature
      });
    }
  }
}

// Export instances
export const byokManager = new BYOKManager();
