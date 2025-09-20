/**
 * Sprint 2 Integration Tests
 * Comprehensive testing for advanced AI integration, quality frameworks, and personalization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import components and utilities
import { AdvancedPromptBuilder, ContentQualityValidator, PromptOptimizer } from '../src/lib/prompt-engineering.js';
import { AIProviderManager, CostOptimizer } from '../src/lib/ai-provider-manager.js';
import { BYOKManager } from '../src/lib/byok-manager.js';
import { UserExpertiseProfiler, PersonalizationEngine } from '../src/lib/personalization-engine.js';
import ConversationalProfiler from '../src/components/ConversationalProfiler.jsx';
import EnhancedCourseGenerationModal from '../src/components/EnhancedCourseGenerationModal.jsx';
import CostManagementDashboard from '../src/components/CostManagementDashboard.jsx';

// Mock API responses
const mockApiResponses = {
  courseGeneration: {
    content: 'Generated course content...',
    tokens_used: 3200,
    estimated_cost: 0.45,
    quality_analysis: {
      score: 0.85,
      metrics: {
        specificityRatio: 0.75,
        exampleDensity: 12,
        aiPatternScore: 2,
        actionableRatio: 0.8,
        structureScore: 0.9
      },
      passed: true,
      recommendations: []
    }
  },
  userProfile: {
    id: 'user-123',
    expertise_field: 'Digital Marketing',
    years_experience: 5,
    expertise_level: 'intermediate',
    teaching_style: 'practical',
    industry_context: 'business'
  },
  costAnalytics: {
    current: { today: 2.45, week: 12.80, month: 45.60 },
    budgets: { daily: 10.00, weekly: 50.00, monthly: 200.00 },
    providers: [
      { name: 'OpenAI', cost: 28.40, color: '#10B981' },
      { name: 'Anthropic', cost: 17.20, color: '#3B82F6' }
    ]
  }
};

// Mock fetch globally
global.fetch = vi.fn();

describe('Sprint 2 Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponses.courseGeneration)
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Advanced Prompt Engineering', () => {
    let promptBuilder;
    let qualityValidator;
    let promptOptimizer;

    beforeEach(() => {
      promptBuilder = new AdvancedPromptBuilder();
      qualityValidator = new ContentQualityValidator();
      promptOptimizer = new PromptOptimizer();
    });

    it('should build personalized prompts with user profile', () => {
      const courseData = {
        title: 'Advanced Digital Marketing',
        context: 'Learn modern marketing strategies',
        duration: '2-4 weeks',
        difficulty_level: 'intermediate'
      };

      const userProfile = {
        expertise_field: 'Digital Marketing',
        years_experience: 5,
        teaching_style: 'practical',
        industry_context: 'business',
        unique_perspective: 'Data-driven approach'
      };

      const prompt = promptBuilder.buildCoursePrompt(courseData, userProfile);

      expect(prompt).toContain('Digital Marketing');
      expect(prompt).toContain('5 years experience');
      expect(prompt).toContain('practical');
      expect(prompt).toContain('Data-driven approach');
      expect(prompt).toContain('business');
    });

    it('should validate content quality accurately', () => {
      const highQualityContent = `
        # Advanced Digital Marketing Strategies

        ## Module 1: Data-Driven Campaign Optimization
        
        In this module, you'll learn to optimize campaigns using Google Analytics 4 and Facebook Ads Manager. 
        
        **Example**: A SaaS company increased conversion rates by 45% using A/B testing with specific UTM parameters.
        
        ### Practical Exercise
        1. Set up conversion tracking in GA4
        2. Create custom audiences based on user behavior
        3. Implement dynamic remarketing campaigns
        
        **Key Metrics to Track:**
        - Cost Per Acquisition (CPA): Target <$50 for B2B
        - Return on Ad Spend (ROAS): Aim for 4:1 minimum
        - Click-Through Rate (CTR): Industry benchmark 2.5%
      `;

      const analysis = qualityValidator.validateContent(highQualityContent);

      expect(analysis.score).toBeGreaterThan(0.7);
      expect(analysis.metrics.specificityRatio).toBeGreaterThan(0.3);
      expect(analysis.metrics.exampleDensity).toBeGreaterThan(5);
      expect(analysis.metrics.actionableRatio).toBeGreaterThan(0.4);
      expect(analysis.passed).toBe(true);
    });

    it('should detect AI-generated patterns', () => {
      const aiGeneratedContent = `
        In today's digital world, it's important to understand the comprehensive guide to marketing.
        Let's dive into the various aspects of this crucial topic without further ado.
        As we've seen, the importance of digital marketing cannot be overstated.
      `;

      const analysis = qualityValidator.validateContent(aiGeneratedContent);

      expect(analysis.metrics.aiPatternScore).toBeGreaterThan(5);
      expect(analysis.score).toBeLessThan(0.5);
      expect(analysis.passed).toBe(false);
    });

    it('should optimize prompts based on quality feedback', () => {
      const originalPrompt = 'Create a course about marketing';
      const generationResult = {
        content: 'Generic marketing content with low specificity'
      };

      const optimization = promptOptimizer.optimizePrompt(originalPrompt, generationResult);

      expect(optimization.optimizedPrompt).toContain('specific');
      expect(optimization.improvements).toHaveLength.greaterThan(0);
      expect(optimization.qualityScore).toBeDefined();
    });
  });

  describe('AI Provider Management', () => {
    let providerManager;
    let costOptimizer;

    beforeEach(() => {
      providerManager = new AIProviderManager();
      costOptimizer = new CostOptimizer(providerManager);
    });

    it('should select optimal model based on requirements', () => {
      const requirements = {
        costStrategy: 'balanced',
        estimatedTokens: 3000,
        qualityPriority: 0.8,
        speedPriority: 0.6
      };

      const selectedModel = providerManager.selectOptimalModel(requirements);

      expect(selectedModel).toBeDefined();
      expect(selectedModel.provider).toBeDefined();
      expect(selectedModel.modelId).toBeDefined();
      expect(selectedModel.score).toBeGreaterThan(0);
    });

    it('should estimate costs accurately', () => {
      const estimatedTokens = 3000;
      const modelId = 'gpt-4o-mini';

      const cost = providerManager.estimateCost(estimatedTokens, modelId);

      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1); // Should be reasonable for mini model
    });

    it('should handle provider fallbacks', async () => {
      // Mock first provider failure
      const mockError = new Error('Provider unavailable');
      
      vi.spyOn(providerManager, 'executeGeneration')
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          content: 'Fallback content',
          usage: { totalTokens: 1000 }
        });

      const result = await providerManager.generateWithOptimalProvider(
        'Test prompt',
        { allowFallback: true }
      );

      expect(result.content).toBe('Fallback content');
      expect(result.fallback).toBe(true);
    });

    it('should optimize batch operations for cost', () => {
      const operations = [
        { estimatedTokens: 1000, priority: 'low' },
        { estimatedTokens: 5000, priority: 'high' },
        { estimatedTokens: 2000, priority: 'medium' }
      ];

      const optimized = costOptimizer.optimizeBatchCosts(operations);

      expect(optimized).toHaveLength(3);
      expect(optimized[1].requirements.costStrategy).toBe('premium'); // High priority
      expect(optimized[0].estimatedCost).toBeDefined();
    });
  });

  describe('BYOK Management', () => {
    let byokManager;

    beforeEach(() => {
      byokManager = new BYOKManager();
    });

    it('should validate API key formats correctly', () => {
      const validOpenAIKey = 'sk-1234567890abcdef1234567890abcdef1234567890abcdef12';
      const invalidOpenAIKey = 'invalid-key';
      const validAnthropicKey = 'sk-ant-api03-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12';

      expect(byokManager.validateKeyFormat('openai', validOpenAIKey)).toBe(true);
      expect(byokManager.validateKeyFormat('openai', invalidOpenAIKey)).toBe(false);
      expect(byokManager.validateKeyFormat('anthropic', validAnthropicKey)).toBe(true);
    });

    it('should mask API keys for display', () => {
      const apiKey = 'sk-1234567890abcdef1234567890abcdef1234567890abcdef12';
      const masked = byokManager.maskApiKey(apiKey);

      expect(masked).toContain('sk-12345');
      expect(masked).toContain('••••••••');
      expect(masked).not.toContain('1234567890abcdef');
    });

    it('should test API key functionality', async () => {
      // Mock successful API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'gpt-4o' }] }),
        headers: new Map([
          ['x-ratelimit-remaining-requests', '1000'],
          ['x-ratelimit-remaining-tokens', '50000']
        ])
      });

      const testResult = await byokManager.testApiKey('openai', 'sk-test123');

      expect(testResult.valid).toBe(true);
      expect(testResult.models).toBeDefined();
      expect(testResult.quota).toBeDefined();
    });
  });

  describe('Personalization Engine', () => {
    let profiler;
    let personalizationEngine;

    beforeEach(() => {
      profiler = new UserExpertiseProfiler();
      personalizationEngine = new PersonalizationEngine();
    });

    it('should determine expertise level from responses', () => {
      const responses = {
        yearsExperience: 7,
        selfAssessment: 'advanced',
        previousCourses: ['Course 1', 'Course 2', 'Course 3'],
        industryRole: 'Senior Marketing Manager'
      };

      const level = profiler.determineExpertiseLevel(responses);

      expect(level).toBe('advanced');
    });

    it('should generate personalized prompts', async () => {
      const courseData = {
        title: 'Marketing Course',
        context: 'Learn marketing',
        duration: '2-4 weeks',
        difficulty_level: 'intermediate'
      };

      const userProfile = mockApiResponses.userProfile;

      const prompt = personalizationEngine.buildPersonalizedPrompt(courseData, userProfile);

      expect(prompt).toContain('Digital Marketing');
      expect(prompt).toContain('practical');
      expect(prompt).toContain('business');
    });

    it('should adapt content from feedback', async () => {
      const feedback = 'The content was too detailed and moved too fast. Need more examples.';
      
      const adaptations = await personalizationEngine.adaptContentFromFeedback(
        'user-123',
        'course-456',
        feedback
      );

      expect(adaptations).toBeDefined();
      expect(adaptations.some(a => a.type === 'content_length')).toBe(true);
      expect(adaptations.some(a => a.type === 'pacing')).toBe(true);
      expect(adaptations.some(a => a.type === 'examples')).toBe(true);
    });
  });

  describe('UI Component Integration', () => {
    it('should render conversational profiler correctly', () => {
      const mockOnComplete = vi.fn();
      const mockOnSkip = vi.fn();

      render(
        <ConversationalProfiler 
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText('Expertise Profiling')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('Skip profiling for now')).toBeInTheDocument();
    });

    it('should handle profiler interactions', async () => {
      const user = userEvent.setup();
      const mockOnComplete = vi.fn();
      const mockOnSkip = vi.fn();

      render(
        <ConversationalProfiler 
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      );

      // Click skip button
      const skipButton = screen.getByText('Skip profiling for now');
      await user.click(skipButton);

      expect(mockOnSkip).toHaveBeenCalled();
    });

    it('should render enhanced generation modal', () => {
      const courseData = {
        courseTitle: 'Test Course',
        courseContext: 'Test context'
      };

      render(
        <EnhancedCourseGenerationModal
          isOpen={true}
          onClose={() => {}}
          courseData={courseData}
          onComplete={() => {}}
        />
      );

      expect(screen.getByText('AI Course Generation')).toBeInTheDocument();
      expect(screen.getByText('Test Course')).toBeInTheDocument();
      expect(screen.getByText('Start Generation')).toBeInTheDocument();
    });

    it('should render cost management dashboard', async () => {
      // Mock fetch for cost data
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.costAnalytics)
      });

      render(<CostManagementDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Cost Management')).toBeInTheDocument();
      });

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full course generation workflow', async () => {
      const user = userEvent.setup();

      // Mock streaming response
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"status","message":"Starting...","progress":10}\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"content","content":"Course content...","progress":50}\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"complete","content":"Full course content","progress":100}\n')
          })
          .mockResolvedValueOnce({ done: true })
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader }
      });

      const courseData = {
        courseTitle: 'Test Course',
        courseContext: 'Test context',
        duration: '2-4 weeks',
        difficulty_level: 'intermediate'
      };

      const mockOnComplete = vi.fn();

      render(
        <EnhancedCourseGenerationModal
          isOpen={true}
          onClose={() => {}}
          courseData={courseData}
          onComplete={mockOnComplete}
        />
      );

      // Start generation
      const startButton = screen.getByText('Start Generation');
      await user.click(startButton);

      // Wait for completion
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      }, { timeout: 5000 });

      expect(fetch).toHaveBeenCalledWith('/api/courses/generate', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Test Course')
      }));
    });

    it('should handle quality validation workflow', () => {
      const content = `
        # Advanced Marketing Course
        
        ## Module 1: Data-Driven Strategies
        Learn to use Google Analytics 4 for campaign optimization.
        
        **Example**: Company X increased ROI by 150% using UTM tracking.
        
        ### Exercise
        1. Set up conversion tracking
        2. Create custom segments
        3. Analyze performance data
      `;

      const validator = new ContentQualityValidator();
      const analysis = validator.validateContent(content);

      expect(analysis.score).toBeGreaterThan(0.6);
      expect(analysis.passed).toBe(true);
      expect(analysis.metrics.specificityRatio).toBeGreaterThan(0.2);
      expect(analysis.metrics.exampleDensity).toBeGreaterThan(5);
    });

    it('should integrate personalization with prompt generation', () => {
      const courseData = {
        title: 'Marketing Mastery',
        context: 'Advanced marketing strategies',
        duration: '2-4 weeks',
        difficulty_level: 'advanced'
      };

      const userProfile = {
        expertise_field: 'Digital Marketing',
        years_experience: 8,
        teaching_style: 'practical',
        industry_context: 'technology',
        unique_perspective: 'Growth hacking approach',
        target_audience: 'Startup founders'
      };

      const promptBuilder = new AdvancedPromptBuilder();
      const prompt = promptBuilder.buildCoursePrompt(courseData, userProfile);

      // Verify personalization elements are included
      expect(prompt).toContain('Digital Marketing');
      expect(prompt).toContain('8 years experience');
      expect(prompt).toContain('practical');
      expect(prompt).toContain('technology');
      expect(prompt).toContain('Growth hacking approach');
      expect(prompt).toContain('Startup founders');

      // Verify course requirements are included
      expect(prompt).toContain('Marketing Mastery');
      expect(prompt).toContain('Advanced marketing strategies');
      expect(prompt).toContain('2-4 weeks');
      expect(prompt).toContain('advanced');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API failures gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const providerManager = new AIProviderManager();
      
      await expect(
        providerManager.generateWithOptimalProvider('Test prompt')
      ).rejects.toThrow('All AI providers failed');
    });

    it('should handle invalid user profiles', () => {
      const personalizationEngine = new PersonalizationEngine();
      const invalidProfile = null;
      const courseData = { title: 'Test', context: 'Test' };

      const prompt = personalizationEngine.buildPersonalizedPrompt(courseData, invalidProfile);

      expect(prompt).toContain('Test');
      expect(prompt).not.toContain('undefined');
    });

    it('should handle empty content validation', () => {
      const validator = new ContentQualityValidator();
      const analysis = validator.validateContent('');

      expect(analysis.score).toBe(0);
      expect(analysis.passed).toBe(false);
      expect(analysis.recommendations).toHaveLength.greaterThan(0);
    });

    it('should handle malformed API keys', () => {
      const byokManager = new BYOKManager();
      
      expect(byokManager.validateKeyFormat('openai', '')).toBe(false);
      expect(byokManager.validateKeyFormat('openai', 'sk-')).toBe(false);
      expect(byokManager.validateKeyFormat('invalid-provider', 'any-key')).toBe(false);
    });
  });
});

/**
 * Performance Tests
 */
describe('Performance Tests', () => {
  it('should validate content quality within acceptable time', () => {
    const validator = new ContentQualityValidator();
    const longContent = 'Test content. '.repeat(1000);

    const startTime = Date.now();
    const analysis = validator.validateContent(longContent);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    expect(analysis).toBeDefined();
  });

  it('should select optimal model efficiently', () => {
    const providerManager = new AIProviderManager();
    
    const startTime = Date.now();
    const model = providerManager.selectOptimalModel({
      costStrategy: 'balanced',
      estimatedTokens: 3000
    });
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    expect(model).toBeDefined();
  });
});

/**
 * Accessibility Tests
 */
describe('Accessibility Tests', () => {
  it('should have proper ARIA labels in conversational profiler', () => {
    render(
      <ConversationalProfiler 
        onComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    
    const skipButton = screen.getByRole('button', { name: /skip profiling/i });
    expect(skipButton).toBeInTheDocument();
  });

  it('should support keyboard navigation in generation modal', () => {
    const courseData = { courseTitle: 'Test', courseContext: 'Test' };
    
    render(
      <EnhancedCourseGenerationModal
        isOpen={true}
        onClose={() => {}}
        courseData={courseData}
        onComplete={() => {}}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute('tabIndex', '0');
  });
});
