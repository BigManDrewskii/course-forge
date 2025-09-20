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
 * Course Generation Prompt Builder
 */
export class CoursePromptBuilder {
  static buildCoursePrompt(courseData, userProfile = null) {
    const { courseTitle, courseContext, timePeriod, difficultyLevel } = courseData
    
    let prompt = `Create a comprehensive, high-quality course titled "${courseTitle}".

Course Requirements:
- Context: ${courseContext}
- Duration: ${timePeriod}
- Difficulty Level: ${difficultyLevel}
- Target: Subject matter experts who want to create their first online course

Generate a detailed course structure that includes:

1. **Course Overview**
   - Clear learning objectives (3-5 specific, measurable outcomes)
   - Target audience description
   - Prerequisites (if any)
   - Course value proposition

2. **Module Breakdown**
   - 4-8 modules depending on the time period
   - Each module should have:
     * Module title and description
     * Learning objectives for the module
     * Estimated time to complete
     * Key concepts covered

3. **Lesson Structure** (for each module)
   - 2-4 lessons per module
   - Lesson titles and descriptions
   - Core content outline
   - Practical exercises or activities
   - Assessment methods

4. **Course Materials**
   - Recommended resources
   - Supplementary materials
   - Tools or software needed

5. **Assessment Strategy**
   - Knowledge checks throughout
   - Module assessments
   - Final project or capstone
   - Grading criteria

**Important Guidelines:**
- Make the content specific and actionable, not generic
- Include real-world examples and case studies
- Ensure progression from basic to advanced concepts
- Focus on practical application and skill development
- Avoid AI-generated "fluff" - provide substantial, valuable content
- Structure for easy export to platforms like Skool, Kajabi, etc.

The course should feel professionally crafted and reflect genuine expertise in the subject matter.`

    // Add user profile context if available
    if (userProfile) {
      prompt += `\n\nInstructor Profile Context:
- Field of Expertise: ${userProfile.field || 'Not specified'}
- Years of Experience: ${userProfile.experience || 'Not specified'}
- Teaching Style: ${userProfile.teachingStyle || 'Not specified'}
- Unique Perspective: ${userProfile.uniquePerspective || 'Not specified'}

Please incorporate the instructor's expertise and perspective into the course design.`
    }

    return prompt
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
