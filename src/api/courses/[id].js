/**
 * Individual course API endpoints
 * GET /api/courses/[id] - Get course by ID
 * PUT /api/courses/[id] - Update course
 * DELETE /api/courses/[id] - Delete course
 */

import { courseQueries, analyticsQueries } from '../../lib/database.js';
import { withAuth, withErrorHandling, withCORS } from '../../lib/auth.js';

async function courseHandler(req, res) {
  const { method } = req;
  const { id } = req.query;
  const userId = req.user.id;

  if (!id) {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  switch (method) {
    case 'GET':
      return handleGetCourse(req, res, id, userId);
    
    case 'PUT':
      return handleUpdateCourse(req, res, id, userId);
    
    case 'DELETE':
      return handleDeleteCourse(req, res, id, userId);
    
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get course by ID
 */
async function handleGetCourse(req, res, courseId, userId) {
  try {
    const course = await courseQueries.findById(courseId, userId);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Record analytics event
    await analyticsQueries.recordEvent({
      user_id: userId,
      event_type: 'course_viewed',
      event_data: {
        course_id: courseId,
        title: course.title
      },
      session_id: req.session?.id,
      ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    return res.status(200).json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Get course error:', error);
    return res.status(500).json({ error: 'Failed to fetch course' });
  }
}

/**
 * Update course
 */
async function handleUpdateCourse(req, res, courseId, userId) {
  try {
    const {
      title,
      description,
      content,
      status,
      structure
    } = req.body;

    // Check if course exists and belongs to user
    const existingCourse = await courseQueries.findById(courseId, userId);
    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Update course content if provided
    let updatedCourse = existingCourse;
    
    if (content !== undefined) {
      updatedCourse = await courseQueries.updateContent(courseId, content, userId);
    }

    if (status !== undefined) {
      updatedCourse = await courseQueries.updateStatus(courseId, status, userId);
    }

    // For other fields, we'd need to add specific update methods
    // For now, we'll handle content and status updates

    // Record analytics event
    await analyticsQueries.recordEvent({
      user_id: userId,
      event_type: 'course_updated',
      event_data: {
        course_id: courseId,
        title: updatedCourse.title,
        updated_fields: Object.keys(req.body)
      },
      session_id: req.session?.id,
      ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    return res.status(200).json({
      success: true,
      course: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
    return res.status(500).json({ error: 'Failed to update course' });
  }
}

/**
 * Delete course
 */
async function handleDeleteCourse(req, res, courseId, userId) {
  try {
    // Check if course exists and belongs to user
    const existingCourse = await courseQueries.findById(courseId, userId);
    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Delete course
    await courseQueries.delete(courseId, userId);

    // Record analytics event
    await analyticsQueries.recordEvent({
      user_id: userId,
      event_type: 'course_deleted',
      event_data: {
        course_id: courseId,
        title: existingCourse.title
      },
      session_id: req.session?.id,
      ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    return res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    return res.status(500).json({ error: 'Failed to delete course' });
  }
}

// Apply middleware
export default withErrorHandling(
  withCORS()(
    withAuth(
      courseHandler
    )
  )
);
