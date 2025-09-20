// Course generation hook for managing AI streaming and state
import { useState, useCallback, useRef } from 'react'
import { aiProvider, CoursePromptBuilder, StreamingHandler } from '../lib/ai-provider'
import { CourseStorage, AnalyticsManager } from '../lib/db'
import { a11yUtils } from '../lib/utils'

/**
 * Custom hook for managing course generation with streaming
 */
export function useCourseGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [content, setContent] = useState('')
  const [progress, setProgress] = useState({
    tokensGenerated: 0,
    estimatedCost: 0,
    completionPercentage: 0
  })
  const [error, setError] = useState(null)
  const [generationId, setGenerationId] = useState(null)
  
  const abortControllerRef = useRef(null)

  /**
   * Generate course content with streaming
   */
  const generateCourse = useCallback(async (courseData, options = {}) => {
    // Reset state
    setIsGenerating(true)
    setContent('')
    setError(null)
    setProgress({
      tokensGenerated: 0,
      estimatedCost: 0,
      completionPercentage: 0
    })

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      // Track analytics
      AnalyticsManager.trackEvent('course_generation_started', {
        courseTitle: courseData.courseTitle,
        difficultyLevel: courseData.difficultyLevel,
        timePeriod: courseData.timePeriod,
        provider: options.provider || 'openai',
        model: options.model || 'gpt-4o-mini'
      })

      // Save generation record
      const generation = CourseStorage.saveCourseGeneration(courseData)
      setGenerationId(generation.id)

      // Build prompt
      const prompt = CoursePromptBuilder.buildCoursePrompt(courseData)

      // Estimate initial cost
      const estimatedCost = aiProvider.estimateCost(
        prompt.length,
        options.maxTokens || 3000,
        options.model || 'gpt-4o-mini'
      )

      setProgress(prev => ({
        ...prev,
        estimatedCost
      }))

      // Create streaming handler
      const streamingHandler = new StreamingHandler(
        // onChunk
        (chunkData) => {
          if (abortControllerRef.current?.signal.aborted) return

          setContent(chunkData.accumulated)
          setProgress(chunkData.progress)

          // Update generation progress in storage
          CourseStorage.updateCourseGeneration(generation.id, {
            tokensUsed: chunkData.progress.tokensGenerated,
            costIncurred: chunkData.progress.estimatedCost
          })
        },
        // onComplete
        (completionData) => {
          if (abortControllerRef.current?.signal.aborted) return

          setContent(completionData.finalContent)
          setIsGenerating(false)

          // Complete generation in storage
          CourseStorage.completeCourseGeneration(
            generation.id,
            completionData.finalContent,
            completionData.tokensUsed,
            completionData.metadata.cost || progress.estimatedCost
          )

          // Track completion
          AnalyticsManager.trackEvent('course_generation_completed', {
            generationId: generation.id,
            tokensUsed: completionData.tokensUsed,
            cost: completionData.metadata.cost || progress.estimatedCost,
            contentLength: completionData.finalContent.length
          })

          // Announce completion to screen readers
          a11yUtils.announce('Course generation completed successfully')
        },
        // onError
        (err) => {
          if (abortControllerRef.current?.signal.aborted) return

          console.error('Course generation error:', err)
          setError(err.message || 'Failed to generate course')
          setIsGenerating(false)

          // Update generation status
          CourseStorage.updateCourseGeneration(generation.id, {
            status: 'failed',
            error: err.message
          })

          // Track error
          AnalyticsManager.trackEvent('course_generation_failed', {
            generationId: generation.id,
            error: err.message
          })

          // Announce error to screen readers
          a11yUtils.announce('Course generation failed. Please try again.', 'assertive')
        }
      )

      // Start generation
      const result = await aiProvider.generateCourseContent(prompt, {
        ...options,
        stream: true
      })

      // Handle streaming
      await streamingHandler.handleStream(result)

    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return

      console.error('Course generation setup error:', err)
      setError(err.message || 'Failed to start course generation')
      setIsGenerating(false)

      // Track setup error
      AnalyticsManager.trackEvent('course_generation_setup_failed', {
        error: err.message
      })
    }
  }, [progress.estimatedCost])

  /**
   * Cancel ongoing generation
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsGenerating(false)
      setError('Generation cancelled by user')

      // Track cancellation
      AnalyticsManager.trackEvent('course_generation_cancelled', {
        generationId
      })

      // Announce cancellation
      a11yUtils.announce('Course generation cancelled')
    }
  }, [generationId])

  /**
   * Reset generation state
   */
  const resetGeneration = useCallback(() => {
    setIsGenerating(false)
    setContent('')
    setError(null)
    setProgress({
      tokensGenerated: 0,
      estimatedCost: 0,
      completionPercentage: 0
    })
    setGenerationId(null)
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  /**
   * Retry failed generation
   */
  const retryGeneration = useCallback(async (courseData, options = {}) => {
    resetGeneration()
    await generateCourse(courseData, options)
  }, [generateCourse, resetGeneration])

  return {
    // State
    isGenerating,
    content,
    progress,
    error,
    generationId,
    
    // Actions
    generateCourse,
    cancelGeneration,
    resetGeneration,
    retryGeneration
  }
}

/**
 * Hook for managing course history
 */
export function useCourseHistory() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  const loadCourses = useCallback(() => {
    setLoading(true)
    try {
      const allCourses = CourseStorage.getAllCourses()
      setCourses(allCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
    } catch (error) {
      console.error('Failed to load course history:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCourse = useCallback((courseId) => {
    try {
      const allCourses = CourseStorage.getAllCourses()
      const filteredCourses = allCourses.filter(course => course.id !== courseId)
      localStorage.setItem(CourseStorage.COURSES_KEY, JSON.stringify(filteredCourses))
      setCourses(filteredCourses)
      
      AnalyticsManager.trackEvent('course_deleted', { courseId })
    } catch (error) {
      console.error('Failed to delete course:', error)
    }
  }, [])

  return {
    courses,
    loading,
    loadCourses,
    deleteCourse
  }
}

/**
 * Hook for managing usage analytics
 */
export function useUsageAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAnalytics = useCallback(() => {
    setLoading(true)
    try {
      const session = JSON.parse(localStorage.getItem('courseforge_session') || '{}')
      const stats = AnalyticsManager.getUsageStats(session.id)
      setAnalytics(stats)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    analytics,
    loading,
    loadAnalytics
  }
}
