/**
 * Personalization Engine and User Expertise Profiling System
 * Creates personalized course content based on user expertise and preferences
 */

import { userQueries, courseQueries, analyticsQueries } from './database.js';

/**
 * Personalization Configuration
 */
const PERSONALIZATION_CONFIG = {
  // Expertise levels and their characteristics
  expertiseLevels: {
    beginner: {
      name: 'Beginner',
      description: 'New to the field with limited experience',
      characteristics: {
        needsBasics: true,
        prefersStepByStep: true,
        requiresExamples: true,
        vocabularyLevel: 'simple',
        pacePreference: 'slow'
      }
    },
    intermediate: {
      name: 'Intermediate',
      description: 'Some experience with practical knowledge gaps',
      characteristics: {
        needsBasics: false,
        prefersStepByStep: true,
        requiresExamples: true,
        vocabularyLevel: 'technical',
        pacePreference: 'moderate'
      }
    },
    advanced: {
      name: 'Advanced',
      description: 'Experienced with specific skill enhancement needs',
      characteristics: {
        needsBasics: false,
        prefersStepByStep: false,
        requiresExamples: false,
        vocabularyLevel: 'expert',
        pacePreference: 'fast'
      }
    },
    expert: {
      name: 'Expert',
      description: 'Deep expertise seeking cutting-edge insights',
      characteristics: {
        needsBasics: false,
        prefersStepByStep: false,
        requiresExamples: false,
        vocabularyLevel: 'expert',
        pacePreference: 'fast'
      }
    }
  },

  // Teaching styles and their approaches
  teachingStyles: {
    practical: {
      name: 'Practical & Hands-On',
      description: 'Learn by doing with real-world projects',
      approach: {
        theoryRatio: 0.2,
        practiceRatio: 0.8,
        exampleTypes: ['case-studies', 'projects', 'exercises'],
        assessmentStyle: 'project-based'
      }
    },
    theoretical: {
      name: 'Theoretical & Conceptual',
      description: 'Deep understanding of principles and concepts',
      approach: {
        theoryRatio: 0.7,
        practiceRatio: 0.3,
        exampleTypes: ['concepts', 'frameworks', 'models'],
        assessmentStyle: 'knowledge-based'
      }
    },
    balanced: {
      name: 'Balanced Approach',
      description: 'Mix of theory and practice',
      approach: {
        theoryRatio: 0.5,
        practiceRatio: 0.5,
        exampleTypes: ['case-studies', 'concepts', 'exercises'],
        assessmentStyle: 'mixed'
      }
    },
    visual: {
      name: 'Visual & Interactive',
      description: 'Learn through diagrams, charts, and visual aids',
      approach: {
        theoryRatio: 0.4,
        practiceRatio: 0.6,
        exampleTypes: ['diagrams', 'infographics', 'interactive'],
        assessmentStyle: 'visual-based'
      }
    }
  },

  // Industry contexts and their specific needs
  industryContexts: {
    technology: {
      name: 'Technology',
      characteristics: {
        fastPaced: true,
        toolFocused: true,
        innovationDriven: true,
        exampleTypes: ['code', 'tools', 'platforms']
      }
    },
    business: {
      name: 'Business & Management',
      characteristics: {
        strategyFocused: true,
        resultsDriven: true,
        peopleOriented: true,
        exampleTypes: ['case-studies', 'frameworks', 'metrics']
      }
    },
    creative: {
      name: 'Creative & Design',
      characteristics: {
        processOriented: true,
        inspirationDriven: true,
        portfolioBased: true,
        exampleTypes: ['portfolios', 'processes', 'inspiration']
      }
    },
    education: {
      name: 'Education & Training',
      characteristics: {
        pedagogyFocused: true,
        learnerCentered: true,
        assessmentDriven: true,
        exampleTypes: ['curricula', 'methods', 'assessments']
      }
    },
    healthcare: {
      name: 'Healthcare & Medical',
      characteristics: {
        evidenceBased: true,
        safetyFocused: true,
        regulationAware: true,
        exampleTypes: ['protocols', 'studies', 'guidelines']
      }
    }
  }
};

/**
 * User Expertise Profiler
 */
export class UserExpertiseProfiler {
  constructor() {
    this.config = PERSONALIZATION_CONFIG;
  }

  /**
   * Create comprehensive user profile through conversational interface
   */
  async createUserProfile(userId, responses) {
    const profile = {
      user_id: userId,
      expertise_field: responses.expertiseField || null,
      years_experience: responses.yearsExperience || 0,
      expertise_level: this.determineExpertiseLevel(responses),
      teaching_style: responses.teachingStyle || 'balanced',
      industry_context: responses.industryContext || null,
      unique_perspective: responses.uniquePerspective || null,
      target_audience: responses.targetAudience || null,
      preferred_examples: this.determinePreferredExamples(responses),
      learning_objectives: responses.learningObjectives || [],
      content_preferences: this.analyzeContentPreferences(responses),
      created_at: new Date(),
      updated_at: new Date()
    };

    // Store profile in database
    const savedProfile = await userQueries.updateProfile(userId, profile);

    // Generate personalization insights
    const insights = this.generatePersonalizationInsights(profile);

    return {
      profile: savedProfile,
      insights,
      recommendations: this.generateRecommendations(profile)
    };
  }

  /**
   * Determine expertise level from responses
   */
  determineExpertiseLevel(responses) {
    const { yearsExperience, selfAssessment, previousCourses, industryRole } = responses;

    let score = 0;

    // Years of experience scoring
    if (yearsExperience >= 10) score += 3;
    else if (yearsExperience >= 5) score += 2;
    else if (yearsExperience >= 2) score += 1;

    // Self-assessment scoring
    const assessmentScores = {
      'complete-beginner': 0,
      'some-knowledge': 1,
      'intermediate': 2,
      'advanced': 3,
      'expert': 4
    };
    score += assessmentScores[selfAssessment] || 1;

    // Previous courses/certifications
    if (previousCourses && previousCourses.length > 5) score += 2;
    else if (previousCourses && previousCourses.length > 2) score += 1;

    // Industry role influence
    const seniorRoles = ['senior', 'lead', 'principal', 'director', 'manager'];
    if (industryRole && seniorRoles.some(role => industryRole.toLowerCase().includes(role))) {
      score += 1;
    }

    // Determine level based on total score
    if (score >= 7) return 'expert';
    if (score >= 5) return 'advanced';
    if (score >= 3) return 'intermediate';
    return 'beginner';
  }

  /**
   * Determine preferred example types
   */
  determinePreferredExamples(responses) {
    const { teachingStyle, industryContext, learningPreference } = responses;

    const exampleMapping = {
      practical: ['case-studies', 'real-world-projects', 'step-by-step-guides'],
      theoretical: ['frameworks', 'models', 'research-studies'],
      visual: ['diagrams', 'infographics', 'screenshots'],
      balanced: ['case-studies', 'frameworks', 'exercises']
    };

    let examples = exampleMapping[teachingStyle] || exampleMapping.balanced;

    // Add industry-specific examples
    if (industryContext) {
      const industryExamples = this.config.industryContexts[industryContext]?.characteristics.exampleTypes || [];
      examples = [...examples, ...industryExamples];
    }

    // Remove duplicates and return
    return [...new Set(examples)];
  }

  /**
   * Analyze content preferences from responses
   */
  analyzeContentPreferences(responses) {
    const preferences = {
      content_depth: 'moderate',
      pace_preference: 'moderate',
      interaction_level: 'moderate',
      assessment_frequency: 'moderate',
      multimedia_preference: 'balanced'
    };

    // Adjust based on expertise level
    const expertiseLevel = this.determineExpertiseLevel(responses);
    const levelConfig = this.config.expertiseLevels[expertiseLevel];

    if (levelConfig) {
      preferences.pace_preference = levelConfig.characteristics.pacePreference;
      preferences.content_depth = levelConfig.characteristics.vocabularyLevel === 'expert' ? 'deep' : 'moderate';
    }

    // Adjust based on teaching style
    const styleConfig = this.config.teachingStyles[responses.teachingStyle];
    if (styleConfig) {
      preferences.interaction_level = styleConfig.approach.practiceRatio > 0.6 ? 'high' : 'moderate';
    }

    return preferences;
  }

  /**
   * Generate personalization insights
   */
  generatePersonalizationInsights(profile) {
    const insights = {
      strengths: [],
      learning_style: null,
      content_approach: null,
      recommended_structure: null
    };

    const expertiseConfig = this.config.expertiseLevels[profile.expertise_level];
    const styleConfig = this.config.teachingStyles[profile.teaching_style];

    // Identify strengths
    if (profile.years_experience >= 5) {
      insights.strengths.push('Extensive practical experience');
    }
    if (profile.unique_perspective) {
      insights.strengths.push('Unique industry perspective');
    }
    if (profile.target_audience) {
      insights.strengths.push('Clear understanding of target learners');
    }

    // Determine learning style
    insights.learning_style = {
      primary: profile.teaching_style,
      characteristics: styleConfig?.approach || {},
      adaptations: this.generateStyleAdaptations(profile)
    };

    // Content approach recommendations
    insights.content_approach = {
      theory_practice_ratio: styleConfig?.approach || { theoryRatio: 0.5, practiceRatio: 0.5 },
      vocabulary_level: expertiseConfig?.characteristics.vocabularyLevel || 'technical',
      example_density: expertiseConfig?.characteristics.requiresExamples ? 'high' : 'moderate'
    };

    // Recommended course structure
    insights.recommended_structure = this.generateStructureRecommendations(profile);

    return insights;
  }

  /**
   * Generate style adaptations
   */
  generateStyleAdaptations(profile) {
    const adaptations = [];

    if (profile.industry_context) {
      const industryConfig = this.config.industryContexts[profile.industry_context];
      if (industryConfig?.characteristics.fastPaced) {
        adaptations.push('Accelerated pacing for industry relevance');
      }
      if (industryConfig?.characteristics.toolFocused) {
        adaptations.push('Emphasis on practical tools and technologies');
      }
    }

    if (profile.target_audience) {
      adaptations.push(`Content tailored for ${profile.target_audience}`);
    }

    return adaptations;
  }

  /**
   * Generate structure recommendations
   */
  generateStructureRecommendations(profile) {
    const expertiseConfig = this.config.expertiseLevels[profile.expertise_level];
    
    const structure = {
      module_count: 'moderate',
      lesson_length: 'moderate',
      assessment_frequency: 'moderate',
      progression_style: 'linear'
    };

    if (expertiseConfig?.characteristics.pacePreference === 'fast') {
      structure.module_count = 'condensed';
      structure.lesson_length = 'longer';
    } else if (expertiseConfig?.characteristics.pacePreference === 'slow') {
      structure.module_count = 'expanded';
      structure.lesson_length = 'shorter';
      structure.assessment_frequency = 'frequent';
    }

    if (expertiseConfig?.characteristics.prefersStepByStep) {
      structure.progression_style = 'sequential';
    } else {
      structure.progression_style = 'modular';
    }

    return structure;
  }

  /**
   * Generate recommendations for course creation
   */
  generateRecommendations(profile) {
    const recommendations = {
      content_focus: [],
      teaching_methods: [],
      assessment_strategies: [],
      engagement_tactics: []
    };

    const expertiseLevel = profile.expertise_level;
    const teachingStyle = profile.teaching_style;

    // Content focus recommendations
    if (expertiseLevel === 'beginner') {
      recommendations.content_focus.push('Start with fundamentals and build progressively');
      recommendations.content_focus.push('Include plenty of context and background');
    } else if (expertiseLevel === 'advanced' || expertiseLevel === 'expert') {
      recommendations.content_focus.push('Focus on advanced techniques and edge cases');
      recommendations.content_focus.push('Include industry best practices and innovations');
    }

    // Teaching method recommendations
    const styleConfig = this.config.teachingStyles[teachingStyle];
    if (styleConfig?.approach.practiceRatio > 0.6) {
      recommendations.teaching_methods.push('Emphasize hands-on exercises and projects');
      recommendations.teaching_methods.push('Provide real-world scenarios and case studies');
    }

    // Assessment strategy recommendations
    if (styleConfig?.approach.assessmentStyle === 'project-based') {
      recommendations.assessment_strategies.push('Use portfolio-based assessments');
      recommendations.assessment_strategies.push('Include peer review components');
    }

    // Engagement tactics
    if (profile.industry_context) {
      recommendations.engagement_tactics.push(`Use ${profile.industry_context} industry examples`);
    }
    if (profile.unique_perspective) {
      recommendations.engagement_tactics.push('Incorporate your unique perspective throughout');
    }

    return recommendations;
  }

  /**
   * Update user profile based on course creation history
   */
  async updateProfileFromHistory(userId) {
    const courses = await courseQueries.findByUserId(userId);
    const analytics = await analyticsQueries.getUserAnalytics(userId);

    if (courses.length === 0) return null;

    // Analyze course patterns
    const patterns = this.analyzeCoursePatterns(courses);
    const preferences = this.analyzeUserPreferences(analytics);

    // Update profile with learned preferences
    const updates = {
      content_preferences: {
        ...preferences,
        learned_from_history: true
      },
      course_patterns: patterns,
      updated_at: new Date()
    };

    return await userQueries.updateProfile(userId, updates);
  }

  /**
   * Analyze patterns in user's course creation
   */
  analyzeCoursePatterns(courses) {
    const patterns = {
      preferred_duration: null,
      common_difficulty_levels: [],
      content_length_preference: null,
      topic_areas: []
    };

    // Analyze duration preferences
    const durations = courses.map(c => c.duration).filter(Boolean);
    patterns.preferred_duration = this.findMostCommon(durations);

    // Analyze difficulty levels
    const difficulties = courses.map(c => c.difficulty_level).filter(Boolean);
    patterns.common_difficulty_levels = this.getFrequencyDistribution(difficulties);

    // Analyze content length
    const contentLengths = courses.map(c => c.content?.length || 0);
    const avgLength = contentLengths.reduce((sum, len) => sum + len, 0) / contentLengths.length;
    patterns.content_length_preference = avgLength > 5000 ? 'detailed' : avgLength > 2000 ? 'moderate' : 'concise';

    // Extract topic areas from titles and descriptions
    patterns.topic_areas = this.extractTopicAreas(courses);

    return patterns;
  }

  /**
   * Analyze user preferences from analytics
   */
  analyzeUserPreferences(analytics) {
    const preferences = {
      generation_frequency: 'moderate',
      revision_tendency: 'moderate',
      export_preferences: []
    };

    if (analytics.course_generations) {
      const generationsPerMonth = analytics.course_generations.length / 3; // Assuming 3 months of data
      preferences.generation_frequency = generationsPerMonth > 10 ? 'high' : generationsPerMonth > 3 ? 'moderate' : 'low';
    }

    if (analytics.course_exports) {
      preferences.export_preferences = this.getFrequencyDistribution(
        analytics.course_exports.map(e => e.format)
      );
    }

    return preferences;
  }

  /**
   * Utility: Find most common value in array
   */
  findMostCommon(arr) {
    if (arr.length === 0) return null;
    
    const frequency = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });

    return Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    );
  }

  /**
   * Utility: Get frequency distribution
   */
  getFrequencyDistribution(arr) {
    const frequency = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .map(([item, count]) => ({ item, count, percentage: (count / arr.length) * 100 }));
  }

  /**
   * Utility: Extract topic areas from course data
   */
  extractTopicAreas(courses) {
    const topics = [];
    
    courses.forEach(course => {
      // Simple keyword extraction from titles and descriptions
      const text = `${course.title} ${course.description || ''}`.toLowerCase();
      
      // Common topic keywords
      const topicKeywords = [
        'ai', 'machine learning', 'data science', 'programming', 'web development',
        'marketing', 'business', 'design', 'photography', 'writing', 'leadership',
        'finance', 'health', 'fitness', 'cooking', 'music', 'art'
      ];

      topicKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          topics.push(keyword);
        }
      });
    });

    return this.getFrequencyDistribution(topics);
  }
}

/**
 * Personalization Engine
 */
export class PersonalizationEngine {
  constructor() {
    this.profiler = new UserExpertiseProfiler();
  }

  /**
   * Generate personalized course prompt
   */
  async generatePersonalizedPrompt(userId, courseData) {
    const userProfile = await userQueries.getProfile(userId);
    
    if (!userProfile) {
      // Return basic prompt if no profile exists
      return this.generateBasicPrompt(courseData);
    }

    const personalizedPrompt = this.buildPersonalizedPrompt(courseData, userProfile);
    
    return personalizedPrompt;
  }

  /**
   * Build personalized prompt based on user profile
   */
  buildPersonalizedPrompt(courseData, userProfile) {
    const { title, context, duration, difficulty_level } = courseData;
    
    let prompt = `You are creating a course titled "${title}" for an instructor with the following profile:\n\n`;

    // Add instructor context
    if (userProfile.expertise_field) {
      prompt += `INSTRUCTOR EXPERTISE: ${userProfile.expertise_field}`;
      if (userProfile.years_experience) {
        prompt += ` (${userProfile.years_experience} years experience)`;
      }
      prompt += '\n';
    }

    if (userProfile.unique_perspective) {
      prompt += `UNIQUE PERSPECTIVE: ${userProfile.unique_perspective}\n`;
    }

    if (userProfile.target_audience) {
      prompt += `TARGET AUDIENCE: ${userProfile.target_audience}\n`;
    }

    prompt += `\nCOURSE REQUIREMENTS:\n`;
    prompt += `- Context: ${context}\n`;
    prompt += `- Duration: ${duration}\n`;
    prompt += `- Difficulty Level: ${difficulty_level}\n\n`;

    // Add personalization based on teaching style
    const styleConfig = PERSONALIZATION_CONFIG.teachingStyles[userProfile.teaching_style];
    if (styleConfig) {
      prompt += `TEACHING STYLE ADAPTATION:\n`;
      prompt += `- Approach: ${styleConfig.name} - ${styleConfig.description}\n`;
      prompt += `- Theory/Practice Ratio: ${Math.round(styleConfig.approach.theoryRatio * 100)}% theory, ${Math.round(styleConfig.approach.practiceRatio * 100)}% practice\n`;
      prompt += `- Preferred Examples: ${styleConfig.approach.exampleTypes.join(', ')}\n`;
      prompt += `- Assessment Style: ${styleConfig.approach.assessmentStyle}\n\n`;
    }

    // Add expertise level adaptations
    const expertiseConfig = PERSONALIZATION_CONFIG.expertiseLevels[userProfile.expertise_level];
    if (expertiseConfig) {
      prompt += `EXPERTISE LEVEL ADAPTATIONS:\n`;
      prompt += `- Level: ${expertiseConfig.name} - ${expertiseConfig.description}\n`;
      prompt += `- Vocabulary Level: ${expertiseConfig.characteristics.vocabularyLevel}\n`;
      prompt += `- Pace Preference: ${expertiseConfig.characteristics.pacePreference}\n`;
      
      if (expertiseConfig.characteristics.needsBasics) {
        prompt += `- Include foundational concepts and background information\n`;
      } else {
        prompt += `- Skip basic concepts, focus on advanced applications\n`;
      }
      
      if (expertiseConfig.characteristics.requiresExamples) {
        prompt += `- Include abundant examples and case studies\n`;
      }
      
      prompt += '\n';
    }

    // Add industry context
    if (userProfile.industry_context) {
      const industryConfig = PERSONALIZATION_CONFIG.industryContexts[userProfile.industry_context];
      if (industryConfig) {
        prompt += `INDUSTRY CONTEXT: ${industryConfig.name}\n`;
        prompt += `- Example Types: ${industryConfig.characteristics.exampleTypes.join(', ')}\n`;
        
        if (industryConfig.characteristics.fastPaced) {
          prompt += `- Emphasize current trends and rapid implementation\n`;
        }
        if (industryConfig.characteristics.toolFocused) {
          prompt += `- Include specific tools and technologies\n`;
        }
        if (industryConfig.characteristics.resultsDriven) {
          prompt += `- Focus on measurable outcomes and ROI\n`;
        }
        
        prompt += '\n';
      }
    }

    // Add preferred examples
    if (userProfile.preferred_examples && userProfile.preferred_examples.length > 0) {
      prompt += `PREFERRED EXAMPLE TYPES: ${userProfile.preferred_examples.join(', ')}\n\n`;
    }

    // Add content structure preferences
    if (userProfile.content_preferences) {
      prompt += `CONTENT PREFERENCES:\n`;
      prompt += `- Content Depth: ${userProfile.content_preferences.content_depth}\n`;
      prompt += `- Pace: ${userProfile.content_preferences.pace_preference}\n`;
      prompt += `- Interaction Level: ${userProfile.content_preferences.interaction_level}\n\n`;
    }

    // Add final instructions
    prompt += `PERSONALIZATION REQUIREMENTS:\n`;
    prompt += `- Reflect the instructor's expertise and unique perspective throughout\n`;
    prompt += `- Use examples and language appropriate for their industry context\n`;
    prompt += `- Structure content according to their preferred teaching style\n`;
    prompt += `- Ensure the course feels authentic to their voice and experience\n`;
    prompt += `- Include specific, actionable content that leverages their background\n\n`;

    prompt += `Generate a course that feels like it was created by this specific instructor, not a generic AI-generated course.`;

    return prompt;
  }

  /**
   * Generate basic prompt for users without profiles
   */
  generateBasicPrompt(courseData) {
    const { title, context, duration, difficulty_level } = courseData;
    
    return `Create a comprehensive, high-quality course titled "${title}".

Course Requirements:
- Context: ${context}
- Duration: ${duration}
- Difficulty Level: ${difficulty_level}

Generate detailed course content that is specific, actionable, and professionally crafted.`;
  }

  /**
   * Adapt content based on user feedback
   */
  async adaptContentFromFeedback(userId, courseId, feedback) {
    const userProfile = await userQueries.getProfile(userId);
    
    // Analyze feedback to understand preferences
    const preferences = this.analyzeFeedback(feedback);
    
    // Update user profile with learned preferences
    if (userProfile) {
      const updatedPreferences = {
        ...userProfile.content_preferences,
        ...preferences,
        last_feedback: new Date()
      };
      
      await userQueries.updateProfile(userId, {
        content_preferences: updatedPreferences
      });
    }

    // Generate adaptation suggestions
    return this.generateAdaptationSuggestions(feedback, preferences);
  }

  /**
   * Analyze user feedback to extract preferences
   */
  analyzeFeedback(feedback) {
    const preferences = {};
    
    const feedbackText = feedback.toLowerCase();
    
    // Analyze content depth preferences
    if (feedbackText.includes('too detailed') || feedbackText.includes('too long')) {
      preferences.content_depth = 'concise';
    } else if (feedbackText.includes('more detail') || feedbackText.includes('too brief')) {
      preferences.content_depth = 'detailed';
    }

    // Analyze pace preferences
    if (feedbackText.includes('too fast') || feedbackText.includes('rushed')) {
      preferences.pace_preference = 'slow';
    } else if (feedbackText.includes('too slow') || feedbackText.includes('boring')) {
      preferences.pace_preference = 'fast';
    }

    // Analyze example preferences
    if (feedbackText.includes('more examples') || feedbackText.includes('need examples')) {
      preferences.example_density = 'high';
    } else if (feedbackText.includes('too many examples')) {
      preferences.example_density = 'low';
    }

    return preferences;
  }

  /**
   * Generate adaptation suggestions based on feedback
   */
  generateAdaptationSuggestions(feedback, preferences) {
    const suggestions = [];

    if (preferences.content_depth === 'concise') {
      suggestions.push({
        type: 'content_length',
        suggestion: 'Reduce content length and focus on key points',
        priority: 'high'
      });
    } else if (preferences.content_depth === 'detailed') {
      suggestions.push({
        type: 'content_depth',
        suggestion: 'Add more detailed explanations and background information',
        priority: 'high'
      });
    }

    if (preferences.pace_preference === 'slow') {
      suggestions.push({
        type: 'pacing',
        suggestion: 'Break content into smaller sections with more gradual progression',
        priority: 'medium'
      });
    } else if (preferences.pace_preference === 'fast') {
      suggestions.push({
        type: 'pacing',
        suggestion: 'Accelerate content delivery and reduce repetition',
        priority: 'medium'
      });
    }

    if (preferences.example_density === 'high') {
      suggestions.push({
        type: 'examples',
        suggestion: 'Add more practical examples and case studies',
        priority: 'medium'
      });
    }

    return suggestions;
  }
}

// Export instances
export const userExpertiseProfiler = new UserExpertiseProfiler();
export const personalizationEngine = new PersonalizationEngine();
