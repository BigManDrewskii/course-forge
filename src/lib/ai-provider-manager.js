/**
 * Intelligent AI Provider Management System
 * Handles multi-provider support, cost optimization, and fallback mechanisms
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, generateText } from 'ai';

/**
 * Enhanced AI Provider Configuration with Performance Metrics
 */
const PROVIDER_CONFIG = {
  openai: {
    name: 'OpenAI',
    models: {
      'gpt-4o': {
        instance: openai('gpt-4o'),
        pricing: { input: 0.0025, output: 0.01 },
        performance: { speed: 0.8, quality: 0.95, reliability: 0.92 },
        maxTokens: 4096,
        strengths: ['reasoning', 'code', 'analysis'],
        weaknesses: ['creativity', 'long-form']
      },
      'gpt-4o-mini': {
        instance: openai('gpt-4o-mini'),
        pricing: { input: 0.00015, output: 0.0006 },
        performance: { speed: 0.95, quality: 0.85, reliability: 0.94 },
        maxTokens: 16384,
        strengths: ['speed', 'cost', 'general'],
        weaknesses: ['complex-reasoning']
      },
      'gpt-3.5-turbo': {
        instance: openai('gpt-3.5-turbo'),
        pricing: { input: 0.0005, output: 0.0015 },
        performance: { speed: 0.9, quality: 0.75, reliability: 0.88 },
        maxTokens: 4096,
        strengths: ['speed', 'cost'],
        weaknesses: ['quality', 'reasoning']
      }
    },
    rateLimit: { requests: 3500, window: 60000 }, // 3500 req/min
    status: 'active'
  },
  
  anthropic: {
    name: 'Anthropic',
    models: {
      'claude-3-5-sonnet': {
        instance: anthropic('claude-3-5-sonnet-20241022'),
        pricing: { input: 0.003, output: 0.015 },
        performance: { speed: 0.7, quality: 0.98, reliability: 0.96 },
        maxTokens: 8192,
        strengths: ['creativity', 'writing', 'analysis', 'safety'],
        weaknesses: ['speed', 'cost']
      },
      'claude-3-haiku': {
        instance: anthropic('claude-3-haiku-20240307'),
        pricing: { input: 0.00025, output: 0.00125 },
        performance: { speed: 0.85, quality: 0.82, reliability: 0.93 },
        maxTokens: 4096,
        strengths: ['speed', 'cost', 'concise'],
        weaknesses: ['complex-tasks']
      }
    },
    rateLimit: { requests: 1000, window: 60000 }, // 1000 req/min
    status: 'active'
  }
};

/**
 * Cost Optimization Strategies
 */
const COST_STRATEGIES = {
  budget: {
    name: 'Budget Optimized',
    description: 'Minimize costs while maintaining acceptable quality',
    modelPreference: ['gpt-4o-mini', 'claude-3-haiku', 'gpt-3.5-turbo'],
    qualityThreshold: 0.7,
    maxCostPerGeneration: 0.50
  },
  
  balanced: {
    name: 'Balanced',
    description: 'Balance cost and quality for optimal value',
    modelPreference: ['gpt-4o-mini', 'claude-3-5-sonnet', 'gpt-4o'],
    qualityThreshold: 0.8,
    maxCostPerGeneration: 1.50
  },
  
  premium: {
    name: 'Premium Quality',
    description: 'Prioritize quality over cost',
    modelPreference: ['claude-3-5-sonnet', 'gpt-4o', 'gpt-4o-mini'],
    qualityThreshold: 0.9,
    maxCostPerGeneration: 5.00
  },
  
  custom: {
    name: 'Custom',
    description: 'User-defined preferences',
    modelPreference: [],
    qualityThreshold: 0.8,
    maxCostPerGeneration: 2.00
  }
};

/**
 * Intelligent AI Provider Manager
 */
export class AIProviderManager {
  constructor() {
    this.providers = PROVIDER_CONFIG;
    this.costStrategies = COST_STRATEGIES;
    this.usageStats = new Map(); // Track usage per provider/model
    this.circuitBreakers = new Map(); // Track provider health
    this.fallbackQueue = [];
  }

  /**
   * Select optimal model based on requirements and strategy
   */
  selectOptimalModel(requirements = {}) {
    const {
      costStrategy = 'balanced',
      contentType = 'course',
      estimatedTokens = 3000,
      qualityPriority = 0.8,
      speedPriority = 0.5,
      userBudget = null,
      userPreferences = {}
    } = requirements;

    const strategy = this.costStrategies[costStrategy] || this.costStrategies.balanced;
    const candidates = this.getAvailableModels();
    
    // Score each model based on requirements
    const scoredModels = candidates.map(model => {
      const score = this.calculateModelScore(model, {
        strategy,
        contentType,
        estimatedTokens,
        qualityPriority,
        speedPriority,
        userBudget,
        userPreferences
      });
      
      return { ...model, score };
    });

    // Sort by score and return best match
    scoredModels.sort((a, b) => b.score - a.score);
    
    return scoredModels[0] || null;
  }

  /**
   * Calculate model score based on multiple factors
   */
  calculateModelScore(model, requirements) {
    const { strategy, estimatedTokens, qualityPriority, speedPriority, userBudget } = requirements;
    
    let score = 0;
    
    // Quality score (weighted by priority)
    score += model.config.performance.quality * qualityPriority * 0.4;
    
    // Speed score (weighted by priority)
    score += model.config.performance.speed * speedPriority * 0.2;
    
    // Reliability score
    score += model.config.performance.reliability * 0.2;
    
    // Cost efficiency score
    const estimatedCost = this.estimateCost(estimatedTokens, model.modelId);
    const costEfficiency = Math.max(0, 1 - (estimatedCost / strategy.maxCostPerGeneration));
    score += costEfficiency * 0.15;
    
    // Strategy preference bonus
    const preferenceIndex = strategy.modelPreference.indexOf(model.modelId);
    if (preferenceIndex !== -1) {
      score += (strategy.modelPreference.length - preferenceIndex) * 0.05;
    }
    
    // Budget constraint penalty
    if (userBudget && estimatedCost > userBudget) {
      score *= 0.3; // Heavy penalty for exceeding budget
    }
    
    // Circuit breaker penalty
    const health = this.getProviderHealth(model.provider);
    score *= health;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get available models with health checks
   */
  getAvailableModels() {
    const models = [];
    
    for (const [providerId, provider] of Object.entries(this.providers)) {
      if (provider.status !== 'active') continue;
      
      for (const [modelId, modelConfig] of Object.entries(provider.models)) {
        models.push({
          provider: providerId,
          modelId,
          config: modelConfig,
          fullId: `${providerId}:${modelId}`
        });
      }
    }
    
    return models.filter(model => this.isModelHealthy(model));
  }

  /**
   * Check if model is healthy (not circuit broken)
   */
  isModelHealthy(model) {
    const breakerKey = `${model.provider}:${model.modelId}`;
    const breaker = this.circuitBreakers.get(breakerKey);
    
    if (!breaker) return true;
    
    // Check if circuit breaker should reset
    if (breaker.state === 'open' && Date.now() - breaker.lastFailure > breaker.resetTimeout) {
      breaker.state = 'half-open';
      breaker.failureCount = 0;
    }
    
    return breaker.state !== 'open';
  }

  /**
   * Get provider health score
   */
  getProviderHealth(providerId) {
    const stats = this.usageStats.get(providerId);
    if (!stats) return 1.0;
    
    const successRate = stats.successful / (stats.successful + stats.failed);
    const avgResponseTime = stats.totalResponseTime / stats.requests;
    
    // Health score based on success rate and response time
    const healthScore = (successRate * 0.7) + (Math.max(0, 1 - avgResponseTime / 10000) * 0.3);
    
    return Math.max(0.1, healthScore); // Minimum 10% health
  }

  /**
   * Estimate cost for generation
   */
  estimateCost(estimatedTokens, modelId) {
    const model = this.findModelConfig(modelId);
    if (!model) return 0;
    
    const inputTokens = Math.ceil(estimatedTokens * 0.3); // Rough estimate
    const outputTokens = Math.ceil(estimatedTokens * 0.7);
    
    const inputCost = (inputTokens / 1000) * model.pricing.input;
    const outputCost = (outputTokens / 1000) * model.pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Find model configuration
   */
  findModelConfig(modelId) {
    for (const provider of Object.values(this.providers)) {
      if (provider.models[modelId]) {
        return provider.models[modelId];
      }
    }
    return null;
  }

  /**
   * Generate content with intelligent provider selection
   */
  async generateWithOptimalProvider(prompt, requirements = {}) {
    const optimalModel = this.selectOptimalModel(requirements);
    
    if (!optimalModel) {
      throw new Error('No suitable AI model available');
    }

    const startTime = Date.now();
    
    try {
      const result = await this.executeGeneration(optimalModel, prompt, requirements);
      
      // Record success
      this.recordUsage(optimalModel.provider, {
        success: true,
        responseTime: Date.now() - startTime,
        tokensUsed: result.usage?.totalTokens || 0,
        cost: this.calculateActualCost(result.usage, optimalModel.modelId)
      });
      
      return {
        ...result,
        provider: optimalModel.provider,
        model: optimalModel.modelId,
        cost: this.calculateActualCost(result.usage, optimalModel.modelId)
      };
      
    } catch (error) {
      // Record failure and try fallback
      this.recordUsage(optimalModel.provider, {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      });
      
      this.updateCircuitBreaker(optimalModel, error);
      
      // Try fallback if available
      return this.tryFallback(prompt, requirements, [optimalModel.fullId]);
    }
  }

  /**
   * Execute generation with specific model
   */
  async executeGeneration(model, prompt, requirements) {
    const { stream = false, maxTokens = 4000, temperature = 0.7 } = requirements;
    
    const modelInstance = model.config.instance;
    
    if (stream) {
      return await streamText({
        model: modelInstance,
        prompt,
        maxTokens: Math.min(maxTokens, model.config.maxTokens),
        temperature
      });
    } else {
      return await generateText({
        model: modelInstance,
        prompt,
        maxTokens: Math.min(maxTokens, model.config.maxTokens),
        temperature
      });
    }
  }

  /**
   * Try fallback providers
   */
  async tryFallback(prompt, requirements, excludeModels = []) {
    const availableModels = this.getAvailableModels()
      .filter(model => !excludeModels.includes(model.fullId))
      .sort((a, b) => b.config.performance.reliability - a.config.performance.reliability);
    
    for (const model of availableModels) {
      try {
        const result = await this.executeGeneration(model, prompt, requirements);
        
        // Record fallback success
        this.recordUsage(model.provider, {
          success: true,
          responseTime: 0, // Don't count fallback time
          tokensUsed: result.usage?.totalTokens || 0,
          cost: this.calculateActualCost(result.usage, model.modelId),
          fallback: true
        });
        
        return {
          ...result,
          provider: model.provider,
          model: model.modelId,
          cost: this.calculateActualCost(result.usage, model.modelId),
          fallback: true
        };
        
      } catch (error) {
        this.recordUsage(model.provider, { success: false, fallback: true });
        continue;
      }
    }
    
    throw new Error('All AI providers failed');
  }

  /**
   * Record usage statistics
   */
  recordUsage(providerId, stats) {
    if (!this.usageStats.has(providerId)) {
      this.usageStats.set(providerId, {
        requests: 0,
        successful: 0,
        failed: 0,
        totalResponseTime: 0,
        totalTokens: 0,
        totalCost: 0
      });
    }
    
    const providerStats = this.usageStats.get(providerId);
    
    providerStats.requests++;
    
    if (stats.success) {
      providerStats.successful++;
      providerStats.totalResponseTime += stats.responseTime || 0;
      providerStats.totalTokens += stats.tokensUsed || 0;
      providerStats.totalCost += stats.cost || 0;
    } else {
      providerStats.failed++;
    }
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreaker(model, error) {
    const breakerKey = `${model.provider}:${model.modelId}`;
    
    if (!this.circuitBreakers.has(breakerKey)) {
      this.circuitBreakers.set(breakerKey, {
        state: 'closed',
        failureCount: 0,
        lastFailure: null,
        resetTimeout: 60000 // 1 minute
      });
    }
    
    const breaker = this.circuitBreakers.get(breakerKey);
    breaker.failureCount++;
    breaker.lastFailure = Date.now();
    
    // Open circuit breaker after 3 failures
    if (breaker.failureCount >= 3) {
      breaker.state = 'open';
      console.warn(`Circuit breaker opened for ${breakerKey}: ${error.message}`);
    }
  }

  /**
   * Calculate actual cost from usage
   */
  calculateActualCost(usage, modelId) {
    if (!usage) return 0;
    
    const model = this.findModelConfig(modelId);
    if (!model) return 0;
    
    const inputCost = (usage.promptTokens || 0) * model.pricing.input / 1000;
    const outputCost = (usage.completionTokens || 0) * model.pricing.output / 1000;
    
    return inputCost + outputCost;
  }

  /**
   * Get usage analytics
   */
  getUsageAnalytics() {
    const analytics = {
      providers: {},
      totalRequests: 0,
      totalCost: 0,
      averageResponseTime: 0,
      successRate: 0
    };
    
    let totalResponseTime = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    
    for (const [providerId, stats] of this.usageStats.entries()) {
      analytics.providers[providerId] = {
        ...stats,
        successRate: stats.successful / (stats.successful + stats.failed),
        averageResponseTime: stats.totalResponseTime / stats.requests,
        averageCost: stats.totalCost / stats.successful
      };
      
      analytics.totalRequests += stats.requests;
      analytics.totalCost += stats.totalCost;
      totalResponseTime += stats.totalResponseTime;
      totalSuccessful += stats.successful;
      totalFailed += stats.failed;
    }
    
    analytics.averageResponseTime = totalResponseTime / analytics.totalRequests;
    analytics.successRate = totalSuccessful / (totalSuccessful + totalFailed);
    
    return analytics;
  }

  /**
   * Reset circuit breakers (admin function)
   */
  resetCircuitBreakers() {
    this.circuitBreakers.clear();
  }

  /**
   * Get cost strategy recommendations
   */
  getCostStrategyRecommendations(userUsage = {}) {
    const { monthlyBudget = 100, averageGenerationsPerMonth = 50 } = userUsage;
    
    const costPerGeneration = monthlyBudget / averageGenerationsPerMonth;
    
    if (costPerGeneration < 0.75) {
      return {
        recommended: 'budget',
        reason: 'Your budget suggests focusing on cost-effective models',
        alternatives: ['balanced']
      };
    } else if (costPerGeneration < 2.0) {
      return {
        recommended: 'balanced',
        reason: 'Your budget allows for a good balance of cost and quality',
        alternatives: ['budget', 'premium']
      };
    } else {
      return {
        recommended: 'premium',
        reason: 'Your budget allows for premium quality models',
        alternatives: ['balanced']
      };
    }
  }
}

/**
 * Cost Optimization Utilities
 */
export class CostOptimizer {
  constructor(providerManager) {
    this.providerManager = providerManager;
  }

  /**
   * Optimize cost for batch operations
   */
  optimizeBatchCosts(operations) {
    const optimized = [];
    
    for (const operation of operations) {
      const requirements = {
        ...operation.requirements,
        costStrategy: this.selectBatchStrategy(operation, operations.length)
      };
      
      optimized.push({
        ...operation,
        requirements,
        estimatedCost: this.providerManager.estimateCost(
          operation.estimatedTokens,
          this.providerManager.selectOptimalModel(requirements)?.modelId
        )
      });
    }
    
    return optimized;
  }

  /**
   * Select strategy for batch operations
   */
  selectBatchStrategy(operation, batchSize) {
    if (batchSize > 10) {
      return 'budget'; // Use budget strategy for large batches
    } else if (operation.priority === 'high') {
      return 'premium';
    } else {
      return 'balanced';
    }
  }

  /**
   * Calculate monthly cost projections
   */
  calculateMonthlyProjection(usagePattern) {
    const { generationsPerDay = 5, averageTokensPerGeneration = 3000 } = usagePattern;
    
    const monthlyGenerations = generationsPerDay * 30;
    const strategies = ['budget', 'balanced', 'premium'];
    
    const projections = {};
    
    for (const strategy of strategies) {
      const model = this.providerManager.selectOptimalModel({
        costStrategy: strategy,
        estimatedTokens: averageTokensPerGeneration
      });
      
      if (model) {
        const costPerGeneration = this.providerManager.estimateCost(
          averageTokensPerGeneration,
          model.modelId
        );
        
        projections[strategy] = {
          costPerGeneration,
          monthlyCost: costPerGeneration * monthlyGenerations,
          model: model.modelId,
          provider: model.provider
        };
      }
    }
    
    return projections;
  }
}

// Export instances
export const aiProviderManager = new AIProviderManager();
export const costOptimizer = new CostOptimizer(aiProviderManager);
