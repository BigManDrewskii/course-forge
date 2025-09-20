/**
 * AI Assistance API Endpoint
 * Provides AI-powered writing assistance for content editing
 */

import { validateSession } from '../../lib/auth.js';
import { rateLimit } from '../../lib/middleware.js';
import { AIProviderManager } from '../../lib/ai-provider-manager.js';

const aiManager = new AIProviderManager();

/**
 * Rate limiting for AI assistance requests
 */
const rateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per window
  message: 'Too many AI assistance requests, please try again later'
});

/**
 * POST /api/ai/assist
 * Provide AI writing assistance for selected text
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
    const { text, prompt, context } = await request.json();
    
    if (!text || !prompt) {
      return new Response(JSON.stringify({ 
        error: 'Text and prompt are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate text length
    if (text.length > 5000) {
      return new Response(JSON.stringify({ 
        error: 'Text too long. Please select a smaller section (max 5000 characters)' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate AI assistance
    const suggestions = await generateAIAssistance({
      text,
      prompt,
      context,
      userId: session.userId
    });

    return new Response(JSON.stringify({
      suggestions,
      usage: {
        inputTokens: Math.ceil(text.length / 4),
        outputTokens: suggestions.reduce((acc, s) => acc + Math.ceil(s.content.length / 4), 0)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI assistance error:', error);
    return new Response(JSON.stringify({ 
      error: 'AI assistance failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Generate AI assistance suggestions
 */
async function generateAIAssistance({ text, prompt, context, userId }) {
  // Build context-aware system prompt
  const systemPrompt = buildSystemPrompt(context);
  
  // Build user prompt
  const userPrompt = buildUserPrompt(text, prompt);

  try {
    // Get AI provider for user
    const provider = await aiManager.getOptimalProvider(userId, {
      task: 'text_editing',
      priority: 'quality'
    });

    // Generate suggestions
    const response = await provider.generateText({
      systemPrompt,
      userPrompt,
      maxTokens: 1000,
      temperature: 0.7,
      stopSequences: ['---END---']
    });

    // Parse and validate suggestions
    const suggestions = parseSuggestions(response.content);
    
    // Add confidence scores
    const scoredSuggestions = await addConfidenceScores(suggestions, text, prompt);

    return scoredSuggestions;

  } catch (error) {
    console.error('AI generation failed:', error);
    
    // Return fallback suggestions
    return [{
      type: 'error',
      content: 'AI assistance is temporarily unavailable. Please try again in a moment.',
      confidence: 0
    }];
  }
}

/**
 * Build system prompt based on context
 */
function buildSystemPrompt(context) {
  const basePrompt = `You are an expert writing assistant specializing in educational content creation. Your role is to help improve course materials by providing clear, actionable suggestions.

Guidelines:
- Provide 2-3 specific, actionable suggestions
- Focus on clarity, engagement, and educational value
- Maintain the original tone and style unless specifically asked to change it
- Ensure suggestions are practical and implementable
- Consider the target audience (course learners)
- Preserve factual accuracy and technical precision`;

  const contextPrompts = {
    course_editing: `
Additional Context: You are helping edit course content for online learning.
- Prioritize clarity and student comprehension
- Suggest practical examples and exercises where appropriate
- Ensure content flows logically from concept to concept
- Consider different learning styles and accessibility`,
    
    lesson_planning: `
Additional Context: You are helping structure lesson content.
- Focus on learning objectives and outcomes
- Suggest clear section breaks and transitions
- Recommend interactive elements or checkpoints
- Ensure content builds progressively`,
    
    assessment_creation: `
Additional Context: You are helping create assessment materials.
- Focus on clear, measurable learning objectives
- Suggest varied question types and difficulty levels
- Ensure assessments align with course content
- Consider accessibility and fairness`
  };

  return basePrompt + (contextPrompts[context] || contextPrompts.course_editing);
}

/**
 * Build user prompt
 */
function buildUserPrompt(text, prompt) {
  return `Please help me improve the following text based on this request: "${prompt}"

Original text:
"""
${text}
"""

Please provide 2-3 specific suggestions in the following format:

SUGGESTION 1:
[Your improved version or specific recommendation]

SUGGESTION 2:
[Your improved version or specific recommendation]

SUGGESTION 3:
[Your improved version or specific recommendation]

---END---

Focus on being specific and actionable. If you're rewriting text, provide the complete rewritten version. If you're suggesting changes, be clear about what to modify.`;
}

/**
 * Parse AI response into structured suggestions
 */
function parseSuggestions(content) {
  const suggestions = [];
  
  // Split by suggestion markers
  const parts = content.split(/SUGGESTION \d+:/);
  
  for (let i = 1; i < parts.length; i++) {
    const suggestionText = parts[i].trim();
    if (suggestionText) {
      suggestions.push({
        type: 'improvement',
        content: suggestionText,
        confidence: 0.8 // Default confidence, will be refined
      });
    }
  }

  // Fallback parsing if structured format not found
  if (suggestions.length === 0) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      suggestions.push({
        type: 'improvement',
        content: lines.join('\n'),
        confidence: 0.6
      });
    }
  }

  return suggestions;
}

/**
 * Add confidence scores to suggestions
 */
async function addConfidenceScores(suggestions, originalText, prompt) {
  return suggestions.map(suggestion => {
    let confidence = suggestion.confidence || 0.8;
    
    // Adjust confidence based on suggestion quality indicators
    const suggestionLength = suggestion.content.length;
    const originalLength = originalText.length;
    
    // Penalize suggestions that are too short or too long
    if (suggestionLength < originalLength * 0.3) {
      confidence -= 0.2;
    } else if (suggestionLength > originalLength * 3) {
      confidence -= 0.1;
    }
    
    // Boost confidence for specific improvement types
    if (prompt.toLowerCase().includes('clarity') && 
        suggestion.content.includes('clear')) {
      confidence += 0.1;
    }
    
    if (prompt.toLowerCase().includes('example') && 
        (suggestion.content.includes('example') || suggestion.content.includes('instance'))) {
      confidence += 0.1;
    }
    
    // Ensure confidence is within bounds
    confidence = Math.max(0.1, Math.min(1.0, confidence));
    
    return {
      ...suggestion,
      confidence
    };
  });
}

/**
 * GET /api/ai/assist/prompts
 * Get suggested prompts for AI assistance
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

    const prompts = {
      clarity: [
        'Make this text clearer and more concise',
        'Simplify the language for better understanding',
        'Remove jargon and use plain language',
        'Improve readability and flow'
      ],
      enhancement: [
        'Add practical examples to illustrate this concept',
        'Expand this section with more detailed information',
        'Add engaging elements to make this more interesting',
        'Include actionable steps or exercises'
      ],
      structure: [
        'Improve the organization and structure',
        'Add smooth transitions between paragraphs',
        'Create better section breaks and headings',
        'Reorganize for logical flow'
      ],
      engagement: [
        'Make this more engaging for learners',
        'Add interactive elements or questions',
        'Include real-world applications',
        'Create hooks to maintain interest'
      ],
      assessment: [
        'Create quiz questions based on this content',
        'Suggest learning objectives for this section',
        'Add reflection questions for students',
        'Create practical exercises'
      ]
    };

    return new Response(JSON.stringify({
      prompts,
      categories: Object.keys(prompts),
      usage: {
        maxTextLength: 5000,
        maxRequestsPerHour: 20,
        supportedContexts: ['course_editing', 'lesson_planning', 'assessment_creation']
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI prompts GET error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to retrieve AI prompts' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
