/**
 * Course generation API endpoint with streaming support
 * POST /api/courses/generate
 */

import { courseQueries, generationQueries, analyticsQueries } from '../../lib/database.js';
import { withAuth, withErrorHandling, withCORS } from '../../lib/auth.js';
import { AIProvider } from '../../lib/ai-provider.js';

async function generateCourseHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user.id;
  const {
    title,
    context,
    duration,
    difficulty_level,
    ai_provider = 'openai',
    ai_model = 'gpt-4o-mini',
    stream = true
  } = req.body;

  // Validate required fields
  if (!title || !context) {
    return res.status(400).json({ error: 'Title and context are required' });
  }

  try {
    // Create generation record
    const generation = await generationQueries.create({
      user_id: userId,
      course_id: null,
      prompt_data: {
        title,
        context,
        duration,
        difficulty_level
      },
      ai_provider,
      ai_model
    });

    // Update generation status to generating
    await generationQueries.updateStatus(generation.id, 'generating');

    if (stream) {
      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial status
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Starting course generation...',
        progress: 0
      })}\n\n`);

      try {
        // Initialize AI provider
        const aiProvider = new AIProvider();
        let fullContent = '';
        let tokenCount = 0;

        // Generate course content with streaming
        const stream = await aiProvider.generateCourseStream({
          title,
          context,
          duration,
          difficulty_level
        }, {
          provider: ai_provider,
          model: ai_model
        });

        // Process stream
        for await (const chunk of stream) {
          if (chunk.type === 'content') {
            fullContent += chunk.content;
            tokenCount += chunk.tokens || 0;
            
            // Send content chunk to client
            res.write(`data: ${JSON.stringify({
              type: 'content',
              content: chunk.content,
              progress: Math.min(90, (fullContent.length / 5000) * 100) // Rough progress estimate
            })}\n\n`);
          } else if (chunk.type === 'status') {
            // Send status update
            res.write(`data: ${JSON.stringify({
              type: 'status',
              message: chunk.message,
              progress: chunk.progress || 0
            })}\n\n`);
          }
        }

        // Calculate cost estimate
        const estimatedCost = aiProvider.calculateCost(tokenCount, ai_provider, ai_model);

        // Create course record
        const course = await courseQueries.create({
          user_id: userId,
          title,
          description: context,
          duration,
          difficulty_level,
          content: fullContent,
          structure: {}, // TODO: Parse structure from content
          generation_id: generation.id,
          ai_provider,
          ai_model
        });

        // Update generation with metrics
        await generationQueries.updateMetrics(
          generation.id,
          tokenCount,
          estimatedCost,
          null, // Quality score will be calculated later
          {}
        );

        // Mark generation as completed
        await generationQueries.updateStatus(generation.id, 'completed');

        // Record analytics
        await analyticsQueries.recordEvent({
          user_id: userId,
          event_type: 'course_generated',
          event_data: {
            course_id: course.id,
            title,
            difficulty_level,
            ai_provider,
            ai_model
          },
          tokens_used: tokenCount,
          cost: estimatedCost,
          session_id: req.session?.id,
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent']
        });

        // Send completion message
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          course: {
            id: course.id,
            title: course.title,
            content: course.content
          },
          metrics: {
            tokens_used: tokenCount,
            estimated_cost: estimatedCost
          },
          progress: 100
        })}\n\n`);

        res.end();

      } catch (error) {
        console.error('Course generation error:', error);
        
        // Update generation status to failed
        await generationQueries.updateStatus(generation.id, 'failed', error.message);

        // Send error to client
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: error.message
        })}\n\n`);

        res.end();
      }
    } else {
      // Non-streaming response (for compatibility)
      try {
        const aiProvider = new AIProvider();
        
        const result = await aiProvider.generateCourse({
          title,
          context,
          duration,
          difficulty_level
        }, {
          provider: ai_provider,
          model: ai_model
        });

        // Create course record
        const course = await courseQueries.create({
          user_id: userId,
          title,
          description: context,
          duration,
          difficulty_level,
          content: result.content,
          structure: result.structure || {},
          generation_id: generation.id,
          ai_provider,
          ai_model
        });

        // Update generation metrics
        await generationQueries.updateMetrics(
          generation.id,
          result.tokens_used,
          result.estimated_cost
        );

        await generationQueries.updateStatus(generation.id, 'completed');

        // Record analytics
        await analyticsQueries.recordEvent({
          user_id: userId,
          event_type: 'course_generated',
          event_data: {
            course_id: course.id,
            title,
            difficulty_level,
            ai_provider,
            ai_model
          },
          tokens_used: result.tokens_used,
          cost: result.estimated_cost,
          session_id: req.session?.id,
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent']
        });

        return res.status(201).json({
          success: true,
          course,
          metrics: {
            tokens_used: result.tokens_used,
            estimated_cost: result.estimated_cost
          }
        });

      } catch (error) {
        console.error('Course generation error:', error);
        await generationQueries.updateStatus(generation.id, 'failed', error.message);
        throw error;
      }
    }

  } catch (error) {
    console.error('Course generation setup error:', error);
    return res.status(500).json({ error: 'Failed to start course generation' });
  }
}

// Apply middleware
export default withErrorHandling(
  withCORS()(
    withAuth(
      generateCourseHandler
    )
  )
);
