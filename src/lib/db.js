// Database utilities and schema for CourseForge
// Using localStorage for MVP - will be replaced with proper database in production

/**
 * Session Management
 */
export class SessionManager {
  static SESSION_KEY = 'courseforge_session'
  static SESSION_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

  static createSession() {
    const sessionId = crypto.randomUUID()
    const session = {
      id: sessionId,
      token: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.SESSION_DURATION).toISOString(),
      userAgent: navigator.userAgent,
    }

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
    return session
  }

  static getSession() {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      if (!sessionData) return null

      const session = JSON.parse(sessionData)
      
      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.error('Error reading session:', error)
      this.clearSession()
      return null
    }
  }

  static updateLastActive() {
    const session = this.getSession()
    if (session) {
      session.lastActive = new Date().toISOString()
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
    }
  }

  static clearSession() {
    localStorage.removeItem(this.SESSION_KEY)
  }

  static getOrCreateSession() {
    let session = this.getSession()
    if (!session) {
      session = this.createSession()
    } else {
      this.updateLastActive()
    }
    return session
  }
}

/**
 * Course Generation Storage
 */
export class CourseStorage {
  static COURSES_KEY = 'courseforge_courses'
  static ANALYTICS_KEY = 'courseforge_analytics'

  static saveCourseGeneration(courseData) {
    const session = SessionManager.getOrCreateSession()
    const generation = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      ...courseData,
      status: 'in_progress',
      tokensUsed: 0,
      costIncurred: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      contentData: null
    }

    const courses = this.getAllCourses()
    courses.push(generation)
    localStorage.setItem(this.COURSES_KEY, JSON.stringify(courses))
    
    return generation
  }

  static updateCourseGeneration(generationId, updates) {
    const courses = this.getAllCourses()
    const index = courses.findIndex(course => course.id === generationId)
    
    if (index !== -1) {
      courses[index] = { ...courses[index], ...updates }
      localStorage.setItem(this.COURSES_KEY, JSON.stringify(courses))
      return courses[index]
    }
    
    return null
  }

  static completeCourseGeneration(generationId, content, tokensUsed, cost) {
    return this.updateCourseGeneration(generationId, {
      status: 'completed',
      contentData: content,
      tokensUsed,
      costIncurred: cost,
      completedAt: new Date().toISOString()
    })
  }

  static getAllCourses() {
    try {
      const coursesData = localStorage.getItem(this.COURSES_KEY)
      return coursesData ? JSON.parse(coursesData) : []
    } catch (error) {
      console.error('Error reading courses:', error)
      return []
    }
  }

  static getCoursesBySession(sessionId) {
    const courses = this.getAllCourses()
    return courses.filter(course => course.sessionId === sessionId)
  }

  static getCourseById(generationId) {
    const courses = this.getAllCourses()
    return courses.find(course => course.id === generationId)
  }
}

/**
 * Analytics and Usage Tracking
 */
export class AnalyticsManager {
  static trackEvent(eventType, metadata = {}) {
    const session = SessionManager.getOrCreateSession()
    const event = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      eventType,
      metadata,
      timestamp: new Date().toISOString()
    }

    const analytics = this.getAllEvents()
    analytics.push(event)
    
    // Keep only last 1000 events to prevent storage bloat
    if (analytics.length > 1000) {
      analytics.splice(0, analytics.length - 1000)
    }
    
    localStorage.setItem(CourseStorage.ANALYTICS_KEY, JSON.stringify(analytics))
  }

  static getAllEvents() {
    try {
      const analyticsData = localStorage.getItem(CourseStorage.ANALYTICS_KEY)
      return analyticsData ? JSON.parse(analyticsData) : []
    } catch (error) {
      console.error('Error reading analytics:', error)
      return []
    }
  }

  static getUsageStats(sessionId) {
    const events = this.getAllEvents()
    const courses = CourseStorage.getCoursesBySession(sessionId)
    
    const sessionEvents = events.filter(event => event.sessionId === sessionId)
    const completedCourses = courses.filter(course => course.status === 'completed')
    
    const totalCost = completedCourses.reduce((sum, course) => sum + (course.costIncurred || 0), 0)
    const totalTokens = completedCourses.reduce((sum, course) => sum + (course.tokensUsed || 0), 0)
    
    return {
      currentSession: {
        cost: totalCost,
        tokensUsed: totalTokens,
        coursesGenerated: completedCourses.length,
        eventsCount: sessionEvents.length
      },
      monthlyUsage: {
        totalCost: totalCost, // For MVP, same as session
        totalTokens: totalTokens,
        coursesGenerated: completedCourses.length,
        averageCostPerCourse: completedCourses.length > 0 ? totalCost / completedCourses.length : 0
      }
    }
  }
}

/**
 * Utility Functions
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
  }).format(amount)
}

export const formatTokenCount = (tokens) => {
  return new Intl.NumberFormat('en-US').format(tokens)
}

export const estimateTokensFromText = (text) => {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

export const generateId = () => {
  return crypto.randomUUID()
}

// Initialize session on module load
SessionManager.getOrCreateSession()
