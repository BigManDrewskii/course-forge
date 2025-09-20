/**
 * Database connection and utilities for CourseForge
 * Provides PostgreSQL connection management and query utilities
 */

import { Pool } from 'pg';

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
};

// Create connection pool
let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool(dbConfig);
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  
  return pool;
}

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params = []) {
  const start = Date.now();
  const pool = getPool();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`Slow query detected (${duration}ms):`, text);
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Execute a transaction
 * @param {Function} callback - Function that receives a client and executes queries
 * @returns {Promise<any>} Transaction result
 */
export async function transaction(callback) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * User management functions
 */
export const userQueries = {
  /**
   * Create a new user
   */
  async create(userData) {
    const { email, name, avatar_url, preferences = {} } = userData;
    const result = await query(
      `INSERT INTO users (email, name, avatar_url, preferences) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [email, name, avatar_url, JSON.stringify(preferences)]
    );
    return result.rows[0];
  },

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    return result.rows[0];
  },

  /**
   * Find user by ID
   */
  async findById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0];
  },

  /**
   * Update user last login
   */
  async updateLastLogin(id) {
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [id]
    );
  },

  /**
   * Update user preferences
   */
  async updatePreferences(id, preferences) {
    const result = await query(
      'UPDATE users SET preferences = $2 WHERE id = $1 RETURNING *',
      [id, JSON.stringify(preferences)]
    );
    return result.rows[0];
  }
};

/**
 * Course management functions
 */
export const courseQueries = {
  /**
   * Create a new course
   */
  async create(courseData) {
    const { 
      user_id, 
      title, 
      description, 
      duration, 
      difficulty_level, 
      content, 
      structure = {},
      generation_id,
      ai_provider,
      ai_model 
    } = courseData;
    
    const result = await query(
      `INSERT INTO courses (
        user_id, title, description, duration, difficulty_level, 
        content, structure, generation_id, ai_provider, ai_model
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        user_id, title, description, duration, difficulty_level,
        content, JSON.stringify(structure), generation_id, ai_provider, ai_model
      ]
    );
    return result.rows[0];
  },

  /**
   * Get courses by user ID
   */
  async findByUserId(userId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT c.*, cg.tokens_used, cg.estimated_cost, cg.quality_score
       FROM courses c
       LEFT JOIN course_generations cg ON c.generation_id = cg.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  /**
   * Get course by ID
   */
  async findById(id, userId = null) {
    const whereClause = userId ? 'WHERE c.id = $1 AND c.user_id = $2' : 'WHERE c.id = $1';
    const params = userId ? [id, userId] : [id];
    
    const result = await query(
      `SELECT c.*, cg.tokens_used, cg.estimated_cost, cg.quality_score
       FROM courses c
       LEFT JOIN course_generations cg ON c.generation_id = cg.id
       ${whereClause}`,
      params
    );
    return result.rows[0];
  },

  /**
   * Update course content
   */
  async updateContent(id, content, userId) {
    const result = await query(
      'UPDATE courses SET content = $2 WHERE id = $1 AND user_id = $3 RETURNING *',
      [id, content, userId]
    );
    return result.rows[0];
  },

  /**
   * Update course status
   */
  async updateStatus(id, status, userId) {
    const result = await query(
      'UPDATE courses SET status = $2 WHERE id = $1 AND user_id = $3 RETURNING *',
      [id, status, userId]
    );
    return result.rows[0];
  },

  /**
   * Delete course
   */
  async delete(id, userId) {
    const result = await query(
      'DELETE FROM courses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rows[0];
  }
};

/**
 * Course generation tracking functions
 */
export const generationQueries = {
  /**
   * Create a new generation record
   */
  async create(generationData) {
    const {
      user_id,
      course_id,
      prompt_data,
      ai_provider,
      ai_model
    } = generationData;
    
    const result = await query(
      `INSERT INTO course_generations (
        user_id, course_id, prompt_data, ai_provider, ai_model
      ) VALUES ($1, $2, $3, $4, $5) 
      RETURNING *`,
      [user_id, course_id, JSON.stringify(prompt_data), ai_provider, ai_model]
    );
    return result.rows[0];
  },

  /**
   * Update generation status
   */
  async updateStatus(id, status, errorMessage = null) {
    const result = await query(
      `UPDATE course_generations 
       SET status = $2, completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
           error_message = $3
       WHERE id = $1 
       RETURNING *`,
      [id, status, errorMessage]
    );
    return result.rows[0];
  },

  /**
   * Update generation metrics
   */
  async updateMetrics(id, tokensUsed, estimatedCost, qualityScore = null, qualityMetrics = {}) {
    const result = await query(
      `UPDATE course_generations 
       SET tokens_used = $2, estimated_cost = $3, quality_score = $4, quality_metrics = $5
       WHERE id = $1 
       RETURNING *`,
      [id, tokensUsed, estimatedCost, qualityScore, JSON.stringify(qualityMetrics)]
    );
    return result.rows[0];
  },

  /**
   * Get user's generation history
   */
  async findByUserId(userId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT cg.*, c.title as course_title
       FROM course_generations cg
       LEFT JOIN courses c ON cg.course_id = c.id
       WHERE cg.user_id = $1
       ORDER BY cg.started_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }
};

/**
 * API key management functions
 */
export const apiKeyQueries = {
  /**
   * Create a new API key
   */
  async create(keyData) {
    const { user_id, name, provider, encrypted_key } = keyData;
    const result = await query(
      `INSERT INTO user_api_keys (user_id, name, provider, encrypted_key) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, user_id, name, provider, is_active, created_at`,
      [user_id, name, provider, encrypted_key]
    );
    return result.rows[0];
  },

  /**
   * Get user's API keys (without the actual keys)
   */
  async findByUserId(userId) {
    const result = await query(
      `SELECT id, name, provider, is_active, created_at, last_used_at
       FROM user_api_keys 
       WHERE user_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Get encrypted API key for use
   */
  async getEncryptedKey(id, userId) {
    const result = await query(
      'SELECT encrypted_key FROM user_api_keys WHERE id = $1 AND user_id = $2 AND is_active = true',
      [id, userId]
    );
    return result.rows[0]?.encrypted_key;
  },

  /**
   * Update last used timestamp
   */
  async updateLastUsed(id) {
    await query(
      'UPDATE user_api_keys SET last_used_at = NOW() WHERE id = $1',
      [id]
    );
  },

  /**
   * Deactivate API key
   */
  async deactivate(id, userId) {
    const result = await query(
      'UPDATE user_api_keys SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rows[0];
  }
};

/**
 * Analytics functions
 */
export const analyticsQueries = {
  /**
   * Record usage event
   */
  async recordEvent(eventData) {
    const {
      user_id,
      event_type,
      event_data = {},
      tokens_used = 0,
      cost = 0,
      session_id,
      ip_address,
      user_agent
    } = eventData;
    
    await query(
      `INSERT INTO usage_analytics (
        user_id, event_type, event_data, tokens_used, cost, 
        session_id, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user_id, event_type, JSON.stringify(event_data), 
        tokens_used, cost, session_id, ip_address, user_agent
      ]
    );
  },

  /**
   * Get user usage summary
   */
  async getUserUsage(userId, days = 30) {
    const result = await query(
      `SELECT 
        COUNT(*) as total_events,
        SUM(tokens_used) as total_tokens,
        SUM(cost) as total_cost,
        COUNT(CASE WHEN event_type = 'course_generated' THEN 1 END) as courses_generated,
        COUNT(CASE WHEN event_type = 'course_exported' THEN 1 END) as courses_exported
       FROM usage_analytics 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
      [userId]
    );
    return result.rows[0];
  },

  /**
   * Get daily usage for charts
   */
  async getDailyUsage(userId, days = 30) {
    const result = await query(
      `SELECT 
        DATE(created_at) as date,
        SUM(tokens_used) as tokens,
        SUM(cost) as cost,
        COUNT(*) as events
       FROM usage_analytics 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [userId]
    );
    return result.rows;
  }
};

/**
 * Session management functions
 */
export const sessionQueries = {
  /**
   * Create a new session
   */
  async create(sessionData) {
    const { user_id, session_token, expires_at, user_agent, ip_address } = sessionData;
    const result = await query(
      `INSERT INTO user_sessions (user_id, session_token, expires_at, user_agent, ip_address) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [user_id, session_token, expires_at, user_agent, ip_address]
    );
    return result.rows[0];
  },

  /**
   * Find session by token
   */
  async findByToken(token) {
    const result = await query(
      `SELECT s.*, u.id as user_id, u.email, u.name 
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = true`,
      [token]
    );
    return result.rows[0];
  },

  /**
   * Delete session
   */
  async delete(token) {
    await query(
      'DELETE FROM user_sessions WHERE session_token = $1',
      [token]
    );
  },

  /**
   * Clean up expired sessions
   */
  async cleanupExpired() {
    const result = await query(
      'DELETE FROM user_sessions WHERE expires_at <= NOW() RETURNING COUNT(*)'
    );
    return result.rowCount;
  }
};

/**
 * Health check function
 */
export async function healthCheck() {
  try {
    const result = await query('SELECT NOW() as timestamp');
    return {
      status: 'healthy',
      timestamp: result.rows[0].timestamp,
      pool: {
        totalCount: pool?.totalCount || 0,
        idleCount: pool?.idleCount || 0,
        waitingCount: pool?.waitingCount || 0
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Close database connections
 */
export async function closeConnections() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
