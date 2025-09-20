/**
 * Advanced Prompt Engineering Framework for CourseForge
 * Three-tier architecture: Context → Structure → Personalization
 */

/**
 * Prompt Engineering Configuration
 */
const PROMPT_CONFIG = {
  // Quality thresholds for content validation
  quality: {
    minSpecificityRatio: 0.3, // Ratio of specific terms to generic terms
    minExampleDensity: 0.1,   // Examples per 100 words
    maxAIPatterns: 0.05,      // Maximum AI-generated patterns
    minActionableContent: 0.4  // Ratio of actionable to theoretical content
  },
  
  // Content structure requirements
  structure: {
    minModules: 3,
    maxModules: 8,
    lessonsPerModule: { min: 2, max: 6 },
    estimatedReadingTime: { min: 5, max: 45 }, // minutes per lesson
  },
  
  // Personalization parameters
  personalization: {
    expertiseWeight: 0.4,
    audienceWeight: 0.3,
    styleWeight: 0.2,
    contextWeight: 0.1
  }
};

/**
 * Advanced Prompt Builder with Three-Tier Architecture
 */
export class AdvancedPromptBuilder {
  constructor() {
    this.config = PROMPT_CONFIG;
  }

  /**
   * Build comprehensive course generation prompt
   */
  buildCoursePrompt(courseData, userProfile = null, options = {}) {
    const {
      title,
      context,
      duration,
      difficulty_level,
      target_audience,
      learning_objectives
    } = courseData;

    const {
      includeExamples = true,
      emphasizeActionable = true,
      avoidGenericContent = true,
      includeAssessments = true
    } = options;

    // Tier 1: Context and Role Definition
    const contextPrompt = this.buildContextTier(courseData, userProfile);
    
    // Tier 2: Structural Guidelines
    const structurePrompt = this.buildStructureTier(courseData, options);
    
    // Tier 3: Personalization and Quality
    const personalizationPrompt = this.buildPersonalizationTier(userProfile, options);

    return `${contextPrompt}\n\n${structurePrompt}\n\n${personalizationPrompt}`;
  }

  /**
   * Tier 1: Context and Role Definition
   */
  buildContextTier(courseData, userProfile) {
    const { title, context, difficulty_level } = courseData;
    
    let roleDefinition = `You are an expert course creator and subject matter expert`;
    
    if (userProfile?.expertise_field) {
      roleDefinition += ` specializing in ${userProfile.expertise_field}`;
    }
    
    if (userProfile?.years_experience) {
      roleDefinition += ` with ${userProfile.years_experience} years of practical experience`;
    }

    return `${roleDefinition}. Your task is to create a comprehensive, high-quality course titled "${title}".

COURSE CONTEXT:
${context}

DIFFICULTY LEVEL: ${difficulty_level}
TARGET OUTCOME: Create a course that transforms learners from their current state to practical competency in the subject matter.

CRITICAL REQUIREMENTS:
- Generate content that reflects genuine expertise, not generic AI output
- Focus on practical application and real-world implementation
- Include specific examples, case studies, and actionable insights
- Avoid theoretical fluff and generic advice
- Structure content for progressive skill building`;
  }

  /**
   * Tier 2: Structural Guidelines
   */
  buildStructureTier(courseData, options) {
    const { duration, target_audience } = courseData;
    const moduleCount = this.calculateOptimalModules(duration);
    
    return `COURSE STRUCTURE REQUIREMENTS:

1. **Course Overview Section**
   - Clear, specific learning objectives (3-5 measurable outcomes)
   - Target audience definition with prerequisites
   - Unique value proposition (what makes this course different)
   - Course completion timeline and commitment expectations

2. **Module Breakdown** (${moduleCount.min}-${moduleCount.max} modules)
   Each module must include:
   - Compelling module title that promises specific outcomes
   - 2-4 focused lessons per module
   - Estimated completion time (realistic and specific)
   - Key concepts with practical applications
   - Real-world examples and case studies
   - Hands-on exercises or projects
   - Knowledge check questions

3. **Lesson Structure** (for each lesson)
   - Hook: Compelling opening that connects to learner goals
   - Core Content: Specific, actionable information
   - Examples: Real-world applications and case studies
   - Practice: Immediate application opportunities
   - Takeaways: Clear, memorable key points

4. **Assessment Integration**
   - Progressive knowledge checks throughout modules
   - Practical assignments that build portfolio value
   - Final capstone project demonstrating mastery
   - Self-assessment rubrics for skill validation

CONTENT QUALITY STANDARDS:
- Minimum 30% specific terminology and industry language
- At least 1 concrete example per 100 words of content
- Maximum 5% generic phrases or AI-typical language
- 40%+ actionable content vs. theoretical explanations`;
  }

  /**
   * Tier 3: Personalization and Quality
   */
  buildPersonalizationTier(userProfile, options) {
    let personalization = `PERSONALIZATION REQUIREMENTS:\n`;

    if (userProfile) {
      if (userProfile.teaching_style) {
        personalization += `- Teaching Style: Adapt content to ${userProfile.teaching_style} approach\n`;
      }
      
      if (userProfile.unique_perspective) {
        personalization += `- Unique Perspective: Incorporate "${userProfile.unique_perspective}" throughout\n`;
      }
      
      if (userProfile.preferred_examples) {
        personalization += `- Example Types: Focus on ${userProfile.preferred_examples}\n`;
      }
      
      if (userProfile.industry_context) {
        personalization += `- Industry Context: Frame examples within ${userProfile.industry_context}\n`;
      }
    }

    return `${personalization}

QUALITY VALIDATION CRITERIA:
- Specificity Test: Does each section contain specific, actionable information?
- Example Density: Are there concrete examples supporting each concept?
- Expertise Reflection: Does the content demonstrate deep subject knowledge?
- Practical Value: Can learners immediately apply what they learn?
- Uniqueness Factor: What makes this course different from generic alternatives?

CONTENT GENERATION INSTRUCTIONS:
1. Start with the course overview and learning objectives
2. Create module outlines with specific learning outcomes
3. Develop detailed lesson content with examples and exercises
4. Include assessment methods and success metrics
5. End with next steps and continued learning resources

AVOID THESE AI PATTERNS:
- Generic introductions like "In today's digital world..."
- Vague promises like "comprehensive guide" without specifics
- Lists without context or practical application
- Theoretical explanations without real-world connection
- Cookie-cutter course structures that could apply to any topic

GENERATE CONTENT THAT:
- Reflects genuine expertise and industry knowledge
- Provides immediate practical value to learners
- Includes specific examples and case studies
- Offers unique insights not found in generic courses
- Creates a clear path from beginner to competent practitioner`;
  }

  /**
   * Calculate optimal module count based on duration
   */
  calculateOptimalModules(duration) {
    const durationMap = {
      '1-2 weeks': { min: 3, max: 4 },
      '2-4 weeks': { min: 4, max: 6 },
      '1-2 months': { min: 6, max: 8 },
      '2-3 months': { min: 7, max: 10 },
      'self-paced': { min: 5, max: 8 }
    };

    return durationMap[duration] || { min: 4, max: 6 };
  }
}

/**
 * Content Quality Validator
 */
export class ContentQualityValidator {
  constructor() {
    this.config = PROMPT_CONFIG.quality;
  }

  /**
   * Validate generated content quality
   */
  validateContent(content) {
    const metrics = this.calculateQualityMetrics(content);
    const score = this.calculateQualityScore(metrics);
    
    return {
      score,
      metrics,
      passed: score >= 0.7, // 70% threshold for quality
      recommendations: this.generateRecommendations(metrics)
    };
  }

  /**
   * Calculate quality metrics
   */
  calculateQualityMetrics(content) {
    const words = content.split(/\s+/);
    const wordCount = words.length;

    return {
      specificityRatio: this.calculateSpecificityRatio(content),
      exampleDensity: this.calculateExampleDensity(content),
      aiPatternScore: this.detectAIPatterns(content),
      actionableRatio: this.calculateActionableRatio(content),
      structureScore: this.evaluateStructure(content),
      wordCount
    };
  }

  /**
   * Calculate specificity ratio (specific vs generic terms)
   */
  calculateSpecificityRatio(content) {
    const specificTerms = [
      // Technical terms, numbers, specific tools, methodologies
      /\b\d+%?\b/g, // Numbers and percentages
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b\w+\.\w+\b/g, // Domain names, file extensions
      /\$\d+/g, // Dollar amounts
      /\b(API|SDK|CSS|HTML|JavaScript|Python|React|Node\.js)\b/gi // Tech terms
    ];

    const genericTerms = [
      /\b(comprehensive|effective|efficient|optimal|best|great|amazing)\b/gi,
      /\b(important|crucial|essential|vital|key|main|primary)\b/gi,
      /\b(various|different|multiple|several|many|numerous)\b/gi
    ];

    const specificCount = specificTerms.reduce((count, regex) => 
      count + (content.match(regex) || []).length, 0);
    
    const genericCount = genericTerms.reduce((count, regex) => 
      count + (content.match(regex) || []).length, 0);

    return specificCount / Math.max(specificCount + genericCount, 1);
  }

  /**
   * Calculate example density
   */
  calculateExampleDensity(content) {
    const exampleIndicators = [
      /\bfor example\b/gi,
      /\bsuch as\b/gi,
      /\blike\b/gi,
      /\bconsider\b/gi,
      /\bimagine\b/gi,
      /\bcase study\b/gi,
      /\breal-world\b/gi
    ];

    const exampleCount = exampleIndicators.reduce((count, regex) => 
      count + (content.match(regex) || []).length, 0);

    const wordCount = content.split(/\s+/).length;
    return (exampleCount / wordCount) * 100; // Examples per 100 words
  }

  /**
   * Detect AI-generated patterns
   */
  detectAIPatterns(content) {
    const aiPatterns = [
      /\bin today's digital world\b/gi,
      /\bin this comprehensive guide\b/gi,
      /\blet's dive into\b/gi,
      /\bwithout further ado\b/gi,
      /\bthe importance of\b/gi,
      /\bit's worth noting\b/gi,
      /\bas we've seen\b/gi
    ];

    const patternCount = aiPatterns.reduce((count, regex) => 
      count + (content.match(regex) || []).length, 0);

    const wordCount = content.split(/\s+/).length;
    return (patternCount / wordCount) * 100; // AI patterns per 100 words
  }

  /**
   * Calculate actionable content ratio
   */
  calculateActionableRatio(content) {
    const actionableIndicators = [
      /\b(create|build|implement|develop|design|configure)\b/gi,
      /\b(step \d+|first|next|then|finally)\b/gi,
      /\b(how to|tutorial|guide|instructions)\b/gi,
      /\b(exercise|practice|assignment|project)\b/gi
    ];

    const theoreticalIndicators = [
      /\b(theory|concept|principle|philosophy|overview)\b/gi,
      /\b(understand|learn|know|realize|recognize)\b/gi,
      /\b(definition|explanation|description|introduction)\b/gi
    ];

    const actionableCount = actionableIndicators.reduce((count, regex) => 
      count + (content.match(regex) || []).length, 0);
    
    const theoreticalCount = theoreticalIndicators.reduce((count, regex) => 
      count + (content.match(regex) || []).length, 0);

    return actionableCount / Math.max(actionableCount + theoreticalCount, 1);
  }

  /**
   * Evaluate content structure
   */
  evaluateStructure(content) {
    const structureElements = {
      headers: (content.match(/^#{1,6}\s+/gm) || []).length,
      lists: (content.match(/^[-*+]\s+/gm) || []).length,
      numberedLists: (content.match(/^\d+\.\s+/gm) || []).length,
      codeBlocks: (content.match(/```[\s\S]*?```/g) || []).length,
      emphasis: (content.match(/\*\*[^*]+\*\*/g) || []).length
    };

    const totalElements = Object.values(structureElements).reduce((sum, count) => sum + count, 0);
    const wordCount = content.split(/\s+/).length;
    
    return Math.min(totalElements / (wordCount / 100), 1); // Structure elements per 100 words, capped at 1
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore(metrics) {
    const weights = {
      specificityRatio: 0.25,
      exampleDensity: 0.20,
      aiPatternScore: -0.30, // Negative weight (fewer AI patterns = better)
      actionableRatio: 0.25,
      structureScore: 0.10
    };

    let score = 0;
    score += metrics.specificityRatio * weights.specificityRatio;
    score += Math.min(metrics.exampleDensity / 10, 1) * weights.exampleDensity; // Normalize to 0-1
    score += (1 - Math.min(metrics.aiPatternScore / 5, 1)) * Math.abs(weights.aiPatternScore); // Invert AI patterns
    score += metrics.actionableRatio * weights.actionableRatio;
    score += metrics.structureScore * weights.structureScore;

    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    if (metrics.specificityRatio < this.config.minSpecificityRatio) {
      recommendations.push({
        type: 'specificity',
        message: 'Add more specific terms, numbers, and technical details',
        priority: 'high'
      });
    }

    if (metrics.exampleDensity < this.config.minExampleDensity * 100) {
      recommendations.push({
        type: 'examples',
        message: 'Include more concrete examples and case studies',
        priority: 'high'
      });
    }

    if (metrics.aiPatternScore > this.config.maxAIPatterns * 100) {
      recommendations.push({
        type: 'ai_patterns',
        message: 'Reduce generic AI-generated phrases and patterns',
        priority: 'critical'
      });
    }

    if (metrics.actionableRatio < this.config.minActionableContent) {
      recommendations.push({
        type: 'actionable',
        message: 'Add more practical, actionable content and exercises',
        priority: 'medium'
      });
    }

    if (metrics.structureScore < 0.1) {
      recommendations.push({
        type: 'structure',
        message: 'Improve content structure with headers, lists, and formatting',
        priority: 'low'
      });
    }

    return recommendations;
  }
}

/**
 * Prompt Optimization Engine
 */
export class PromptOptimizer {
  constructor() {
    this.promptBuilder = new AdvancedPromptBuilder();
    this.qualityValidator = new ContentQualityValidator();
  }

  /**
   * Optimize prompt based on previous generation results
   */
  optimizePrompt(originalPrompt, generationResult, userFeedback = null) {
    const qualityAnalysis = this.qualityValidator.validateContent(generationResult.content);
    
    let optimizedPrompt = originalPrompt;

    // Apply optimizations based on quality metrics
    if (qualityAnalysis.metrics.specificityRatio < 0.3) {
      optimizedPrompt += `\n\nEMPHASIS: Include more specific technical details, numbers, and industry terminology.`;
    }

    if (qualityAnalysis.metrics.exampleDensity < 10) {
      optimizedPrompt += `\n\nEMPHASIS: Add concrete examples and real-world case studies for each major concept.`;
    }

    if (qualityAnalysis.metrics.aiPatternScore > 5) {
      optimizedPrompt += `\n\nWARNING: Avoid generic AI phrases. Write with authentic expertise and unique perspective.`;
    }

    // Incorporate user feedback
    if (userFeedback) {
      optimizedPrompt += `\n\nUSER FEEDBACK: ${userFeedback}`;
    }

    return {
      optimizedPrompt,
      improvements: qualityAnalysis.recommendations,
      qualityScore: qualityAnalysis.score
    };
  }
}

// Export instances
export const promptBuilder = new AdvancedPromptBuilder();
export const qualityValidator = new ContentQualityValidator();
export const promptOptimizer = new PromptOptimizer();
