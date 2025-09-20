import React, { useState, useEffect } from 'react'
import { CourseInputForm } from './components/CourseInputForm'
import { CourseGenerationModal } from './components/CourseGenerationModal'
import { useCourseGeneration } from './hooks/useCourseGeneration'
import { SessionManager, AnalyticsManager } from './lib/db'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Sparkles, Zap, Target, Users } from 'lucide-react'
import { cn } from './lib/utils'
import './App.css'

function App() {
  const [showModal, setShowModal] = useState(false)
  const [currentCourseData, setCurrentCourseData] = useState(null)
  
  const {
    isGenerating,
    content,
    progress,
    error,
    generateCourse,
    cancelGeneration,
    resetGeneration,
    retryGeneration
  } = useCourseGeneration()

  // Initialize session and track page view
  useEffect(() => {
    SessionManager.getOrCreateSession()
    AnalyticsManager.trackEvent('page_view', { page: 'home' })
  }, [])

  const handleCourseSubmit = async (courseData) => {
    setCurrentCourseData(courseData)
    setShowModal(true)
    
    // Start generation
    await generateCourse(courseData, {
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxTokens: 3000,
      temperature: 0.7
    })
  }

  const handleModalClose = () => {
    setShowModal(false)
    resetGeneration()
    setCurrentCourseData(null)
  }

  const handleRetry = async () => {
    if (currentCourseData) {
      await retryGeneration(currentCourseData, {
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxTokens: 3000,
        temperature: 0.7
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <h1 className="text-xl font-bold">CourseForge</h1>
              <Badge variant="secondary" className="ml-2">
                Beta
              </Badge>
            </div>
            
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
              Create Professional Courses with{' '}
              <span className="text-primary">AI Precision</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transform your expertise into comprehensive, high-quality courses. 
              No templates, no generic content—just professional curriculum tailored to your knowledge.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="border-0 bg-muted/30 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Generate comprehensive courses in minutes, not weeks
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-muted/30 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Target className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Expert Quality</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered content that reflects your unique expertise
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-muted/30 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Platform Ready</h3>
                <p className="text-sm text-muted-foreground">
                  Export to Skool, Kajabi, or any platform you choose
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Form Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4">Ready to Create Your Course?</h3>
            <p className="text-muted-foreground">
              Fill in the details below and watch as AI transforms your expertise into a structured, professional course.
            </p>
          </div>
          
          <CourseInputForm 
            onSubmit={handleCourseSubmit}
            isLoading={isGenerating}
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-8">How CourseForge Works</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: '01', title: 'Describe', desc: 'Tell us about your course topic and expertise' },
                { step: '02', title: 'Generate', desc: 'AI creates a comprehensive curriculum structure' },
                { step: '03', title: 'Review', desc: 'Edit and refine the generated content' },
                { step: '04', title: 'Export', desc: 'Download and deploy to your platform of choice' }
              ].map((item, index) => (
                <div key={index} className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto">
                    {item.step}
                  </div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 CourseForge. Built with AI precision for course creators.</p>
        </div>
      </footer>

      {/* Course Generation Modal */}
      <CourseGenerationModal
        isOpen={showModal}
        onClose={handleModalClose}
        courseData={currentCourseData}
        content={content}
        progress={progress}
        isGenerating={isGenerating}
        error={error}
        onRetry={handleRetry}
        onCancel={cancelGeneration}
      />
    </div>
  )
}

export default App
