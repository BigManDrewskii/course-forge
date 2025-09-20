/**
 * Export Generation API Endpoint
 * Handles course export in multiple formats with streaming progress
 */

import { validateSession } from '../../lib/auth.js';
import { rateLimit } from '../../lib/middleware.js';
import { ExportManager } from '../../lib/export-manager.js';

const exportManager = new ExportManager();

/**
 * Rate limiting for export requests
 */
const rateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 exports per window
  message: 'Too many export requests, please try again later'
});

/**
 * POST /api/export/generate
 * Generate course export in specified format
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
    const { content, metadata, format, options } = await request.json();
    
    if (!content || !format) {
      return new Response(JSON.stringify({ 
        error: 'Content and format are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate format
    const supportedFormats = ['markdown', 'html', 'pdf', 'scorm', 'presentation', 'json'];
    if (!supportedFormats.includes(format)) {
      return new Response(JSON.stringify({ 
        error: `Unsupported format: ${format}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'progress',
                progress: 0,
                message: 'Starting export...'
              })}\n\n`
            )
          );

          // Generate export with progress callbacks
          const result = await exportManager.generateExport({
            content,
            metadata,
            format,
            options: options || {},
            userId: session.userId,
            onProgress: (progress, message) => {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: 'progress',
                    progress,
                    message
                  })}\n\n`
                )
              );
            }
          });

          // Send completion
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'complete',
                downloadUrl: result.downloadUrl,
                filename: result.filename,
                size: result.size,
                format: result.format
              })}\n\n`
            )
          );

          controller.close();

        } catch (error) {
          console.error('Export generation error:', error);
          
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error.message
              })}\n\n`
            )
          );
          
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Export API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Export generation failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/export/formats
 * Get available export formats and their capabilities
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

    const formats = exportManager.getSupportedFormats();

    return new Response(JSON.stringify({
      formats,
      capabilities: {
        markdown: {
          features: ['formatting', 'links', 'images', 'tables'],
          platforms: ['GitHub', 'Notion', 'Obsidian', 'Any text editor'],
          options: ['includeMetadata', 'includeTableOfContents', 'filename']
        },
        html: {
          features: ['styling', 'interactivity', 'responsive', 'embeddable'],
          platforms: ['Any web browser', 'LMS platforms', 'Websites'],
          options: ['includeMetadata', 'includeTableOfContents', 'theme', 'responsive', 'filename']
        },
        pdf: {
          features: ['print-ready', 'professional', 'universal', 'secure'],
          platforms: ['Any PDF reader', 'Print', 'Email sharing'],
          options: ['includeMetadata', 'includeTableOfContents', 'pageSize', 'pageNumbers', 'filename']
        },
        scorm: {
          features: ['lms-compatible', 'tracking', 'interactive', 'standards-compliant'],
          platforms: ['Moodle', 'Canvas', 'Blackboard', 'Most LMS'],
          options: ['includeMetadata', 'scormVersion', 'completionTracking', 'filename']
        },
        presentation: {
          features: ['slides', 'animations', 'speaker-notes', 'templates'],
          platforms: ['PowerPoint', 'Google Slides', 'Keynote'],
          options: ['includeMetadata', 'template', 'slideLayout', 'filename']
        },
        json: {
          features: ['structured', 'api-ready', 'parseable', 'lightweight'],
          platforms: ['APIs', 'Databases', 'Custom applications'],
          options: ['includeMetadata', 'pretty', 'filename']
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Export formats GET error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to retrieve export formats' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
