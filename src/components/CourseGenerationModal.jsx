import React, { useEffect, useRef } from 'react'
import { X, Copy, Download, Loader2, DollarSign, Hash, Percent } from 'lucide-react'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { cn, formatCurrency, formatTokenCount, copyToClipboard, downloadTextAsFile, sanitizeFilename, focusUtils } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export function CourseGenerationModal({
  isOpen,
  onClose,
  courseData,
  content,
  progress,
  isGenerating,
  error,
  onRetry,
  onCancel
}) {
  const modalRef = useRef(null)
  const contentRef = useRef(null)
  const cleanupFocusTrap = useRef(null)

  // Focus management following agents.md requirements
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Trap focus within modal
      cleanupFocusTrap.current = focusUtils.trapFocus(modalRef.current)
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      return () => {
        if (cleanupFocusTrap.current) {
          cleanupFocusTrap.current()
        }
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (contentRef.current && content) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (isGenerating) {
          onCancel()
        } else {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isGenerating, onCancel, onClose])

  const handleCopy = async () => {
    const success = await copyToClipboard(content)
    if (success) {
      // Show toast or feedback (could be enhanced with a toast system)
      console.log('Content copied to clipboard')
    }
  }

  const handleDownload = () => {
    const filename = sanitizeFilename(courseData?.courseTitle || 'course') + '.md'
    downloadTextAsFile(content, filename, 'text/markdown')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => !isGenerating && onClose()}
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl h-[90vh] mx-4 bg-background border rounded-lg shadow-2xl flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex-1 min-w-0">
              <h2 id="modal-title" className="text-xl font-semibold truncate">
                {isGenerating ? 'Generating Course...' : 'Course Generated'}
              </h2>
              <p id="modal-description" className="text-sm text-muted-foreground mt-1 truncate">
                {courseData?.courseTitle}
              </p>
            </div>
            
            {/* Progress and Stats */}
            {(isGenerating || progress.tokensGenerated > 0) && (
              <div className="flex items-center gap-4 mx-4">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4" aria-hidden="true" />
                  <span>{formatTokenCount(progress.tokensGenerated)} tokens</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" aria-hidden="true" />
                  <span>{formatCurrency(progress.estimatedCost)}</span>
                </div>
                {isGenerating && (
                  <div className="flex items-center gap-2 text-sm">
                    <Percent className="h-4 w-4" aria-hidden="true" />
                    <span>{Math.round(progress.completionPercentage)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isGenerating ? onCancel() : onClose()}
              className="shrink-0"
              aria-label={isGenerating ? "Cancel generation" : "Close modal"}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          {isGenerating && (
            <div className="px-6 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <Progress 
                  value={progress.completionPercentage} 
                  className="flex-1"
                  aria-label={`Generation progress: ${Math.round(progress.completionPercentage)}%`}
                />
                <Badge variant="secondary" className="shrink-0">
                  {Math.round(progress.completionPercentage)}%
                </Badge>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 flex min-h-0">
            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
              <ScrollArea 
                ref={contentRef}
                className="flex-1 p-6"
                aria-label="Generated course content"
              >
                {error ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="rounded-full bg-destructive/10 p-3">
                      <X className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-destructive mb-2">Generation Failed</h3>
                      <p className="text-sm text-muted-foreground mb-4">{error}</p>
                      <Button onClick={onRetry} variant="outline">
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : content ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {content}
                    </pre>
                  </div>
                ) : isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div>
                      <h3 className="font-semibold mb-2">Generating Your Course</h3>
                      <p className="text-sm text-muted-foreground">
                        Our AI is crafting a comprehensive course based on your requirements...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>No content to display</p>
                  </div>
                )}
              </ScrollArea>

              {/* Action Bar */}
              {content && !isGenerating && (
                <>
                  <Separator />
                  <div className="p-6 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Course generated successfully</span>
                        <Badge variant="outline" className="ml-2">
                          {formatTokenCount(progress.tokensGenerated)} tokens
                        </Badge>
                        <Badge variant="outline">
                          {formatCurrency(progress.estimatedCost)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownload}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        <Button onClick={onClose}>
                          Done
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Cancel Button for Generation */}
              {isGenerating && (
                <>
                  <Separator />
                  <div className="p-6 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Generation in progress... This may take a few minutes.
                      </p>
                      <Button
                        variant="outline"
                        onClick={onCancel}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
