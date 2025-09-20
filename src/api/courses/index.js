/**
 * Courses API endpoints
 * GET /api/courses - List user's courses
 * POST /api/courses - Create a new course
 */

import { courseQueries, generationQueries, analyticsQueries } from '../../lib/database.js';
import { withAuth, withErrorHandling, withCORS } from '../../lib/auth.js';

async function coursesHandler(req, res) {
  const { method } = req;
  const userId = req.user.id;

  switch (method) {
    case 'GET':
      return handleGetCourses(req, res, userId);
    
    case 'POST':
      return handleCreateCourse(req, res, userId);
    
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get user's courses
 */
async function handleGetCourses(req, res, userId) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let courses = await courseQueries.findByUserId(userId, parseInt(limit), offset);

    // Filter by status if provided
    if (status) {
      courses = courses.filter(course => course.status === status);
    }

    return res.status(200).json({
      success: true,
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: courses.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    return res.status(500).json({ error: 'Failed to fetch courses' });
  }
}

/**
 * Create a new course
 */
async function handleCreateCourse(req, res, userId) {
  try {
    const {
      title,
      description,
      duration,
      difficulty_level,
      content,
      structure,
      ai_provider,
      ai_model,
      generation_data
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Create generation record first if generation data is provided
    let generationId = null;
    if (generation_data) {
      const generation = await generationQueries.create({
        user_id: userId,
        course_id: null, // Will be updated after course creation
        prompt_data: generation_data,
        ai_provider: ai_provider || 'openai',
        ai_model: ai_model || 'gpt-4o-mini'
      });
      generationId = generation.id;
    }

    // Create course
    const course = await courseQueries.create({
      user_id: userId,
      title,
      description,
      duration,
      difficulty_level,
      content,
      structure,
      generation_id: generationId,
      ai_provider,
      ai_model
    });

    // Update generation with course ID
    if (generationId) {
      await generationQueries.updateStatus(generationId, 'completed');
    }

    // Record analytics event
    await analyticsQueries.recordEvent({
      user_id: userId,
      event_type: 'course_created',
      event_data: {
        course_id: course.id,
        title,
        difficulty_level,
        ai_provider
      },
      session_id: req.session?.id,
      ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    return res.status(201).json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    return res.status(500).json({ error: 'Failed to create course' });
  }
}

// Apply middleware
export default withErrorHandling(
  withCORS()(
    withAuth(
      coursesHandler
    )
  )
);
