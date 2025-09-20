// AI Provider service for CourseForge
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { streamText, generateText } from 'ai'

/**
 * AI Provider Configuration
 */
const AI_PROVIDERS = {
  openai: {
    'gpt-4o': openai('gpt-4o'),
    'gpt-4o-mini': openai('gpt-4o-mini'),
    'gpt-3.5-turbo': openai('gpt-3.5-turbo')
  },
  anthropic: {
    'claude-3-5-sonnet': anthropic('claude-3-5-sonnet-20241022'),
    'claude-3-haiku': anthropic('claude-3-haiku-20240307')
  }
}

/**
 * Pricing information (per 1K tokens)
 */
const PRICING = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 }
}

/**
 * AI Provider Class
 */
export class AIProvider {
  constructor() {
    this.providers = AI_PROVIDERS
    this.pricing = PRICING
  }

  /**
   * Generate course with streaming support (Enhanced with advanced prompt engineering)
   */
  async generateCourseStream(courseData, options = {}) {
    const {
      provider = 'openai',
      model = 'gpt-4o-mini',
      maxTokens = 4000,
      temperature = 0.7,
      userProfile = null,
      qualityValidation = true
    } = options

    // Use advanced prompt engineering
    const { promptBuilder } = await import('./prompt-engineering.js');
    const prompt = promptBuilder.buildCoursePrompt(courseData, userProfile, {
      includeExamples: true,
      emphasizeActionable: true,
      avoidGenericContent: true,
      includeAssessments: true
    });
    
    try {
      const modelInstance = this.getModel(provider, model)
      
      const result = await streamText({
        model: modelInstance,
        prompt,
        maxTokens,
        temperature,
      })

      // Return async generator for streaming with quality validation
      return this.createStreamGenerator(result, { 
        provider, 
        model, 
        maxTokens, 
        temperature,
        qualityValidation,
        userProfile
      })
    } catch (error) {
      console.error('AI generation error:', error)
      throw new Error(`Failed to generate course: ${error.message}`)
    }
  }

  /**
   * Generate course without streaming (for compatibility)
   */
  async generateCourse(courseData, options = {}) {
    const {
      provider = 'openai',
      model = 'gpt-4o-mini',
      maxTokens = 4000,
      temperature = 0.7
    } = options

    const prompt = CoursePromptBuilder.buildCoursePrompt(courseData)
    
    try {
      const modelInstance = this.getModel(provider, model)
      
      const result = await generateText({
        model: modelInstance,
        prompt,
        maxTokens,
        temperature,
      })

      return {
        content: result.text,
        tokens_used: result.usage?.totalTokens || 0,
        estimated_cost: this.calculateCost(result.usage, model),
        structure: this.parseStructure(result.text)
      }
    } catch (error) {
      console.error('AI generation error:', error)
      throw new Error(`Failed to generate course: ${error.message}`)
    }
  }

  /**
   * Create async generator for streaming responses with quality validation
   */
  async* createStreamGenerator(streamResult, metadata) {
    let accumulatedContent = ''
    let tokenCount = 0
    let qualityValidator = null

    // Initialize quality validator if enabled
    if (metadata.qualityValidation) {
      const { qualityValidator: QualityValidator } = await import('./prompt-engineering.js');
      qualityValidator = QualityValidator;
    }

    // Send initial status
    yield {
      type: 'status',
      message: 'Initializing advanced course generation...',
      progress: 5
    }

    try {
      for await (const chunk of streamResult.textStream) {
        accumulatedContent += chunk
        tokenCount += this.estimateTokensInChunk(chunk)

        // Calculate progress
        const progress = Math.min(10 + (tokenCount / metadata.maxTokens) * 75, 85)

        // Yield content chunk
        yield {
          type: 'content',
          content: chunk,
          tokens: this.estimateTokensInChunk(chunk),
          progress,
          accumulated: accumulatedContent
        }

        // Yield periodic status updates with quality hints
        if (tokenCount % 100 === 0) {
          let statusMessage = `Generating course content... (${tokenCount} tokens)`;
          
          // Add quality feedback during generation
          if (qualityValidator && accumulatedContent.length > 500) {
            const quickCheck = qualityValidator.calculateQualityMetrics(accumulatedContent);
            if (quickCheck.aiPatternScore > 5) {
              statusMessage += ' - Enhancing content specificity...';
            } else if (quickCheck.exampleDensity < 5) {
              statusMessage += ' - Adding practical examples...';
            }
          }

          yield {
            type: 'status',
            message: statusMessage,
            progress
          }
        }
      }

      // Quality validation phase
      yield {
        type: 'status',
        message: 'Validating content quality...',
        progress: 90
      }

      let qualityAnalysis = null;
      if (qualityValidator) {
        qualityAnalysis = qualityValidator.validateContent(accumulatedContent);
        
        yield {
          type: 'quality_check',
          quality_score: qualityAnalysis.score,
          quality_metrics: qualityAnalysis.metrics,
          recommendations: qualityAnalysis.recommendations,
          passed: qualityAnalysis.passed
        }
      }

      // Final processing
      yield {
        type: 'status',
        message: 'Finalizing course structure...',
        progress: 95
      }

      // Parse structure from content
      const structure = this.parseStructure(accumulatedContent)

      yield {
        type: 'complete',
        content: accumulatedContent,
        tokens_used: tokenCount,
        estimated_cost: this.calculateCost({ totalTokens: tokenCount }, metadata.model),
        structure,
        quality_analysis: qualityAnalysis,
        progress: 100
      }

    } catch (error) {
      yield {
        type: 'error',
        error: error.message
      }
    }
  }

  /**
   * Parse course structure from generated content
   */
  parseStructure(content) {
    try {
      const structure = {
        modules: [],
        overview: '',
        objectives: []
      }

      // Extract course overview
      const overviewMatch = content.match(/## Course Overview\s*([\s\S]*?)(?=##|$)/i)
      if (overviewMatch) {
        structure.overview = overviewMatch[1].trim()
      }

      // Extract learning objectives
      const objectivesMatch = content.match(/learning objectives?:?\s*([\s\S]*?)(?=##|\n\n)/i)
      if (objectivesMatch) {
        const objectives = objectivesMatch[1]
          .split(/[-*]\s+/)
          .filter(obj => obj.trim())
          .map(obj => obj.trim())
        structure.objectives = objectives
      }

      // Extract modules
      const moduleMatches = content.matchAll(/## Module \d+:?\s*([^\n]+)\s*([\s\S]*?)(?=## Module|\n## |$)/gi)
      for (const match of moduleMatches) {
        const moduleTitle = match[1].trim()
        const moduleContent = match[2].trim()
        
        structure.modules.push({
          title: moduleTitle,
          content: moduleContent,
          lessons: this.extractLessons(moduleContent)
        })
      }

      return structure
    } catch (error) {
      console.warn('Error parsing course structure:', error)
      return {}
    }
  }

  /**
   * Extract lessons from module content
   */
  extractLessons(moduleContent) {
    const lessons = []
    const lessonMatches = moduleContent.matchAll(/### Lesson \d+:?\s*([^\n]+)/gi)
    
    for (const match of lessonMatches) {
      lessons.push({
        title: match[1].trim()
      })
    }
    
    return lessons
  }

  /**
   * Estimate tokens in a text chunk
   */
  estimateTokensInChunk(chunk) {
    return Math.ceil(chunk.length / 4) // Rough estimation: 1 token ≈ 4 characters
  }

  /**
   * Get model instance
   */
  getModel(provider, model) {
    const providerModels = this.providers[provider]
    if (!providerModels) {
      throw new Error(`Unsupported provider: ${provider}`)
    }
    
    const selectedModel = providerModels[model]
    if (!selectedModel) {
      throw new Error(`Unsupported model: ${model} for provider: ${provider}`)
    }
    
    return selectedModel
  }

  /**
   * Generate course content with streaming
   */
  async generateCourseContent(prompt, options = {}) {
    const {
      provider = 'openai',
      model = 'gpt-4o-mini',
      maxTokens = 3000,
      temperature = 0.7,
      stream = true
    } = options

    try {
      const modelInstance = this.getModel(provider, model)
      
      if (stream) {
        const result = await streamText({
          model: modelInstance,
          prompt,
          maxTokens,
          temperature,
        })

        return {
          type: 'stream',
          content: result.textStream,
          metadata: {
            provider,
            model,
            maxTokens,
            temperature
          }
        }
      } else {
        const result = await generateText({
          model: modelInstance,
          prompt,
          maxTokens,
          temperature,
        })

        return {
          type: 'text',
          content: result.text,
          metadata: {
            provider,
            model,
            tokensUsed: result.usage?.totalTokens || 0,
            cost: this.calculateCost(result.usage, model)
          }
        }
      }
    } catch (error) {
      console.error('AI generation error:', error)
      throw new Error(`Failed to generate content: ${error.message}`)
    }
  }

  /**
   * Calculate cost based on token usage
   */
  calculateCost(usage, model) {
    const pricing = this.pricing[model]
    if (!pricing || !usage) return 0
    
    const inputCost = (usage.promptTokens || 0) * pricing.input / 1000
    const outputCost = (usage.completionTokens || 0) * pricing.output / 1000
    
    return inputCost + outputCost
  }

  /**
   * Estimate cost before generation
   */
  estimateCost(inputLength, maxTokens, model) {
    const pricing = this.pricing[model]
    if (!pricing) return 0
    
    const estimatedInputTokens = Math.ceil(inputLength / 4) // Rough estimation
    const inputCost = estimatedInputTokens * pricing.input / 1000
    const outputCost = maxTokens * pricing.output / 1000
    
    return inputCost + outputCost
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(provider) {
    const providerModels = this.providers[provider]
    return providerModels ? Object.keys(providerModels) : []
  }

  /**
   * Get all available providers
   */
  getAvailableProviders() {
    return Object.keys(this.providers)
  }
}

/**
 * Course Generation Prompt Builder (Legacy - replaced by advanced prompt engineering)
 * @deprecated Use AdvancedPromptBuilder from prompt-engineering.js instead
 */
export class CoursePromptBuilder {
  static buildCoursePrompt(courseData, userProfile = null) {
    // Import the new prompt builder
    const { promptBuilder } = require('./prompt-engineering.js');
    return promptBuilder.buildCoursePrompt(courseData, userProfile);
  }

  static buildModulePrompt(moduleTitle, moduleDescription, courseContext) {
    return `Create detailed content for the module "${moduleTitle}".

Module Description: ${moduleDescription}
Course Context: ${courseContext}

Generate comprehensive content including:
1. Detailed lesson plans
2. Learning activities
3. Assessment questions
4. Practical exercises
5. Key takeaways

Ensure the content is specific, actionable, and professionally crafted.`
  }
}

/**
 * Streaming Response Handler
 */
export class StreamingHandler {
  constructor(onChunk, onComplete, onError) {
    this.onChunk = onChunk
    this.onComplete = onComplete
    this.onError = onError
    this.accumulatedContent = ''
    this.tokenCount = 0
  }

  async handleStream(streamResult) {
    try {
      for await (const chunk of streamResult.content) {
        this.accumulatedContent += chunk
        this.tokenCount += this.estimateTokensInChunk(chunk)

        // Call chunk handler with progress data
        if (this.onChunk) {
          this.onChunk({
            chunk,
            accumulated: this.accumulatedContent,
            progress: {
              tokensGenerated: this.tokenCount,
              estimatedCost: this.estimateCostFromTokens(this.tokenCount, streamResult.metadata.model),
              completionPercentage: Math.min(
                (this.tokenCount / streamResult.metadata.maxTokens) * 100,
                95
              )
            }
          })
        }
      }

      // Call completion handler
      if (this.onComplete) {
        this.onComplete({
          finalContent: this.accumulatedContent,
          tokensUsed: this.tokenCount,
          metadata: streamResult.metadata
        })
      }

    } catch (error) {
      console.error('Streaming error:', error)
      if (this.onError) {
        this.onError(error)
      }
    }
  }

  estimateTokensInChunk(chunk) {
    return Math.ceil(chunk.length / 4)
  }

  estimateCostFromTokens(tokens, model) {
    const aiProvider = new AIProvider()
    return aiProvider.calculateCost({ completionTokens: tokens, promptTokens: 0 }, model)
  }
}

// Export singleton instance
export const aiProvider = new AIProvider()
