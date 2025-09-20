-- CourseForge Database Schema
-- Phase 2: Production-ready PostgreSQL schema with proper indexing and constraints

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and user management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- User preferences and settings
    preferences JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User API keys for BYOK (Bring Your Own Key) functionality
CREATE TABLE user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- User-friendly name for the key
    provider VARCHAR(20) NOT NULL, -- 'openai' or 'anthropic'
    encrypted_key TEXT NOT NULL, -- Encrypted API key
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_provider CHECK (provider IN ('openai', 'anthropic')),
    CONSTRAINT unique_user_key_name UNIQUE (user_id, name)
);

-- User expertise profiles for personalization
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Professional background
    professional_background TEXT,
    expertise_areas TEXT[], -- Array of expertise areas
    teaching_style VARCHAR(50), -- 'practical', 'theoretical', 'conversational', etc.
    target_audience VARCHAR(100),
    
    -- Personalization data
    preferred_course_structure JSONB DEFAULT '{}',
    content_preferences JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT one_profile_per_user UNIQUE (user_id)
);

-- Courses table for storing generated courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Course metadata
    title VARCHAR(500) NOT NULL,
    description TEXT,
    duration VARCHAR(50), -- '1-2 weeks', '2-4 weeks', etc.
    difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
    
    -- Course content
    content TEXT NOT NULL, -- Markdown content
    structure JSONB DEFAULT '{}', -- Course structure metadata
    
    -- Generation metadata
    generation_id UUID, -- Links to course_generations table
    ai_provider VARCHAR(20), -- Which AI provider was used
    ai_model VARCHAR(50), -- Which model was used
    
    -- Status and timestamps
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_difficulty CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived'))
);

-- Course generations table for tracking AI generation sessions
CREATE TABLE course_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    
    -- Generation parameters
    prompt_data JSONB NOT NULL, -- Original prompt and parameters
    ai_provider VARCHAR(20) NOT NULL,
    ai_model VARCHAR(50) NOT NULL,
    
    -- Cost tracking
    tokens_used INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10, 6) DEFAULT 0.00,
    
    -- Generation status and timing
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Quality metrics
    quality_score DECIMAL(3, 2), -- 0.00 to 1.00
    quality_metrics JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_generation_status CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    CONSTRAINT valid_quality_score CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1))
);

-- User sessions for session management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Usage analytics for tracking user behavior and costs
CREATE TABLE usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event tracking
    event_type VARCHAR(50) NOT NULL, -- 'course_generated', 'course_exported', etc.
    event_data JSONB DEFAULT '{}',
    
    -- Cost tracking
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0.00,
    
    -- Metadata
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_tokens CHECK (tokens_used >= 0),
    CONSTRAINT valid_cost CHECK (cost >= 0)
);

-- Course exports for tracking export history
CREATE TABLE course_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Export details
    export_format VARCHAR(20) NOT NULL, -- 'markdown', 'pdf', 'json'
    export_options JSONB DEFAULT '{}', -- Customization options
    file_size INTEGER, -- Size in bytes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_export_format CHECK (export_format IN ('markdown', 'pdf', 'json'))
);

-- Indexes for performance optimization
-- User-related indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- API keys indexes
CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX idx_user_api_keys_active ON user_api_keys(is_active) WHERE is_active = true;

-- Courses indexes
CREATE INDEX idx_courses_user_id ON courses(user_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_created_at ON courses(created_at);
CREATE INDEX idx_courses_user_status ON courses(user_id, status);

-- Course generations indexes
CREATE INDEX idx_course_generations_user_id ON course_generations(user_id);
CREATE INDEX idx_course_generations_course_id ON course_generations(course_id);
CREATE INDEX idx_course_generations_status ON course_generations(status);
CREATE INDEX idx_course_generations_started_at ON course_generations(started_at);

-- Sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Analytics indexes
CREATE INDEX idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX idx_usage_analytics_event_type ON usage_analytics(event_type);
CREATE INDEX idx_usage_analytics_created_at ON usage_analytics(created_at);
CREATE INDEX idx_usage_analytics_user_date ON usage_analytics(user_id, created_at);

-- Exports indexes
CREATE INDEX idx_course_exports_course_id ON course_exports(course_id);
CREATE INDEX idx_course_exports_user_id ON course_exports(user_id);
CREATE INDEX idx_course_exports_format ON course_exports(export_format);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
-- User dashboard view with course counts and recent activity
CREATE VIEW user_dashboard AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.created_at,
    COUNT(c.id) as total_courses,
    COUNT(CASE WHEN c.status = 'published' THEN 1 END) as published_courses,
    COUNT(CASE WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_courses,
    SUM(ua.cost) as total_spent,
    SUM(CASE WHEN ua.created_at >= NOW() - INTERVAL '30 days' THEN ua.cost ELSE 0 END) as monthly_spent
FROM users u
LEFT JOIN courses c ON u.id = c.user_id
LEFT JOIN usage_analytics ua ON u.id = ua.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.email, u.created_at;

-- Course analytics view
CREATE VIEW course_analytics AS
SELECT 
    c.id,
    c.title,
    c.user_id,
    c.created_at,
    c.status,
    cg.ai_provider,
    cg.ai_model,
    cg.tokens_used,
    cg.estimated_cost,
    cg.quality_score,
    COUNT(ce.id) as export_count
FROM courses c
LEFT JOIN course_generations cg ON c.generation_id = cg.id
LEFT JOIN course_exports ce ON c.id = ce.course_id
GROUP BY c.id, c.title, c.user_id, c.created_at, c.status, 
         cg.ai_provider, cg.ai_model, cg.tokens_used, cg.estimated_cost, cg.quality_score;

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts and authentication data';
COMMENT ON TABLE user_api_keys IS 'User-owned API keys for BYOK functionality';
COMMENT ON TABLE user_profiles IS 'User expertise profiles for content personalization';
COMMENT ON TABLE courses IS 'Generated courses and their metadata';
COMMENT ON TABLE course_generations IS 'AI generation sessions and cost tracking';
COMMENT ON TABLE user_sessions IS 'User session management';
COMMENT ON TABLE usage_analytics IS 'User behavior and cost analytics';
COMMENT ON TABLE course_exports IS 'Course export history and formats';
