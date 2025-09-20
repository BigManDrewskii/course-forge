import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage 
} from './ui/form'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { BookOpen, Clock, Target, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

// Validation schema
const courseSchema = z.object({
  courseTitle: z
    .string()
    .min(5, 'Course title must be at least 5 characters')
    .max(100, 'Course title must be less than 100 characters'),
  courseContext: z
    .string()
    .min(20, 'Course context must be at least 20 characters')
    .max(1000, 'Course context must be less than 1000 characters'),
  timePeriod: z
    .string()
    .min(1, 'Please select a time period'),
  difficultyLevel: z
    .string()
    .min(1, 'Please select a difficulty level')
})

const timePeriodOptions = [
  { value: '1-2 hours', label: '1-2 Hours (Quick Course)' },
  { value: '3-5 hours', label: '3-5 Hours (Half Day)' },
  { value: '6-10 hours', label: '6-10 Hours (Full Day)' },
  { value: '2-3 days', label: '2-3 Days (Weekend)' },
  { value: '1 week', label: '1 Week (Intensive)' },
  { value: '2-4 weeks', label: '2-4 Weeks (Comprehensive)' },
  { value: '1-3 months', label: '1-3 Months (In-Depth)' }
]

const difficultyOptions = [
  { value: 'beginner', label: 'Beginner (No prior knowledge)' },
  { value: 'intermediate', label: 'Intermediate (Some experience)' },
  { value: 'advanced', label: 'Advanced (Experienced learners)' },
  { value: 'expert', label: 'Expert (Professional level)' }
]

export function CourseInputForm({ onSubmit, isLoading = false }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const form = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      courseTitle: '',
      courseContext: '',
      timePeriod: '',
      difficultyLevel: ''
    }
  })

  const { watch, handleSubmit, formState: { errors, isValid } } = form

  // Watch for changes to show unsaved changes warning
  React.useEffect(() => {
    const subscription = watch(() => {
      setHasUnsavedChanges(true)
    })
    return () => subscription.unsubscribe()
  }, [watch])

  // Warn user about unsaved changes (agents.md requirement)
  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !isLoading) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, isLoading])

  const onFormSubmit = async (data) => {
    try {
      await onSubmit(data)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <BookOpen className="h-6 w-6" aria-hidden="true" />
          Create Your Course
        </CardTitle>
        <CardDescription>
          Tell us about your course and we'll generate a comprehensive curriculum for you
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* Course Title */}
            <FormField
              control={form.control}
              name="courseTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Target className="h-4 w-4" aria-hidden="true" />
                    Course Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Complete Guide to Digital Marketing"
                      error={errors.courseTitle?.message}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A clear, descriptive title that captures what students will learn
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Course Context */}
            <FormField
              control={form.control}
              name="courseContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" aria-hidden="true" />
                    Course Context & Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what your course will cover, who it's for, and what students will achieve. Include your unique perspective, key topics, and any specific methodologies you want to teach."
                      className="min-h-[120px] resize-y"
                      error={errors.courseContext?.message}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide detailed context about your course content, target audience, and learning outcomes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Period */}
            <FormField
              control={form.control}
              name="timePeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Course Duration
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger 
                        className={cn(
                          errors.timePeriod && "border-destructive focus-visible:ring-destructive"
                        )}
                      >
                        <SelectValue placeholder="Select course duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timePeriodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How much time should students expect to spend completing your course?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Difficulty Level */}
            <FormField
              control={form.control}
              name="difficultyLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger 
                        className={cn(
                          errors.difficultyLevel && "border-destructive focus-visible:ring-destructive"
                        )}
                      >
                        <SelectValue placeholder="Select difficulty level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {difficultyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    What level of prior knowledge should students have?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={isLoading}
                disabled={!isValid || isLoading}
              >
                {isLoading ? 'Generating Course...' : 'Generate Course'}
              </Button>
            </div>

            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && !isLoading && (
              <div 
                className="rounded-md bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/20 dark:border-amber-800"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  You have unsaved changes. Make sure to generate your course before leaving.
                </p>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
