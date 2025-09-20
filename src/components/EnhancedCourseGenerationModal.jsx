/**
 * Enhanced Course Generation Modal
 * Advanced modal with quality indicators, real-time feedback, and streaming display
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  X, 
  Download, 
  Copy, 
  Share2, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Sparkles,
  Brain,
  Target,
  Clock,
  DollarSign,
  Zap,
  Eye,
  Settings,
  TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Quality Score Component
 */
function QualityScore({ score, metrics, className }) {
  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Very Good';
    if (score >= 0.7) return 'Good';
    if (score >= 0.6) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className={cn("p-3 rounded-lg border", getScoreColor(score), className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Content Quality</span>
        <Badge variant="secondary" className="text-xs">
          {Math.round(score * 100)}% - {getScoreLabel(score)}
        </Badge>
      </div>
      
      {metrics && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span>Specificity:</span>
            <span className="font-medium">{Math.round(metrics.specificityRatio * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Examples:</span>
            <span className="font-medium">{Math.round(metrics.exampleDensity)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Actionable:</span>
            <span className="font-medium">{Math.round(metrics.actionableRatio * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Structure:</span>
            <span className="font-medium">{Math.round(metrics.structureScore * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generation Stats Component
 */
function GenerationStats({ stats, className }) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      <div className="text-center p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center mb-1">
          <Clock className="w-4 h-4 text-gray-600" />
        </div>
        <div className="text-xs text-gray-600">Duration</div>
        <div className="text-sm font-medium">{stats.duration || '0s'}</div>
      </div>
      
      <div className="text-center p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center mb-1">
          <Zap className="w-4 h-4 text-gray-600" />
        </div>
        <div className="text-xs text-gray-600">Tokens</div>
        <div className="text-sm font-medium">{stats.tokens || 0}</div>
      </div>
      
      <div className="text-center p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center mb-1">
          <DollarSign className="w-4 h-4 text-gray-600" />
        </div>
        <div className="text-xs text-gray-600">Cost</div>
        <div className="text-sm font-medium">${stats.cost || '0.00'}</div>
      </div>
    </div>
  );
}

/**
 * Streaming Progress Component
 */
function StreamingProgress({ progress, status, phase, className }) {
  const phases = [
    { id: 'initializing', label: 'Initializing', icon: Brain },
    { id: 'generating', label: 'Generating Content', icon: Sparkles },
    { id: 'validating', label: 'Quality Check', icon: CheckCircle },
    { id: 'finalizing', label: 'Finalizing', icon: Target }
  ];

  const currentPhaseIndex = phases.findIndex(p => p.id === phase);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{status}</span>
        <span className="font-medium">{Math.round(progress)}%</span>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <div className="flex justify-between">
        {phases.map((phaseItem, index) => {
          const Icon = phaseItem.icon;
          const isActive = index === currentPhaseIndex;
          const isCompleted = index < currentPhaseIndex;
          
          return (
            <div 
              key={phaseItem.id}
              className={cn(
                "flex flex-col items-center text-xs",
                isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center mb-1",
                isActive ? "bg-blue-100" : isCompleted ? "bg-green-100" : "bg-gray-100"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span>{phaseItem.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Content Preview Component
 */
function ContentPreview({ content, isStreaming, className }) {
  const previewRef = useRef(null);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (isStreaming && previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Course Preview</h4>
        <div className="flex items-center gap-2">
          {isStreaming && (
            <Badge variant="secondary" className="text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
              Streaming
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={previewRef}
        className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto text-sm leading-relaxed"
      >
        {content ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <div className="text-gray-500 italic">
            Course content will appear here as it's generated...
          </div>
        )}
        
        {isStreaming && (
          <div className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1"></div>
        )}
      </div>
    </div>
  );
}

/**
 * Enhanced Course Generation Modal Component
 */
export function EnhancedCourseGenerationModal({ 
  isOpen, 
  onClose, 
  courseData, 
  onComplete,
  className 
}) {
  const [generationState, setGenerationState] = useState('idle'); // idle, generating, completed, error
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [phase, setPhase] = useState('initializing');
  const [content, setContent] = useState('');
  const [qualityAnalysis, setQualityAnalysis] = useState(null);
  const [generationStats, setGenerationStats] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setGenerationState('idle');
      setProgress(0);
      setStatus('');
      setPhase('initializing');
      setContent('');
      setQualityAnalysis(null);
      setGenerationStats({});
      setRecommendations([]);
    }
  }, [isOpen]);

  /**
   * Start course generation
   */
  const startGeneration = async () => {
    setGenerationState('generating');
    setStartTime(Date.now());
    setProgress(5);
    setStatus('Initializing advanced course generation...');
    setPhase('initializing');

    try {
      // Simulate AI generation with streaming
      const response = await fetch('/api/courses/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...courseData,
          stream: true,
          qualityValidation: true
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleStreamData(data);
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }

    } catch (error) {
      setGenerationState('error');
      setStatus(`Error: ${error.message}`);
    }
  };

  /**
   * Handle streaming data
   */
  const handleStreamData = (data) => {
    switch (data.type) {
      case 'status':
        setStatus(data.message);
        setProgress(data.progress);
        break;

      case 'content':
        setContent(prev => prev + data.content);
        setProgress(data.progress);
        setPhase('generating');
        setGenerationStats(prev => ({
          ...prev,
          tokens: data.tokens || prev.tokens || 0
        }));
        break;

      case 'quality_check':
        setQualityAnalysis({
          score: data.quality_score,
          metrics: data.quality_metrics,
          recommendations: data.recommendations,
          passed: data.passed
        });
        setPhase('validating');
        break;

      case 'complete':
        setGenerationState('completed');
        setProgress(100);
        setStatus('Course generation completed!');
        setPhase('finalizing');
        
        const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
        setGenerationStats({
          duration: `${duration}s`,
          tokens: data.tokens_used,
          cost: data.estimated_cost?.toFixed(4) || '0.00'
        });

        if (data.quality_analysis?.recommendations) {
          setRecommendations(data.quality_analysis.recommendations);
        }

        // Call completion callback
        onComplete({
          content: data.content,
          structure: data.structure,
          qualityAnalysis: data.quality_analysis,
          stats: generationStats
        });
        break;

      case 'error':
        setGenerationState('error');
        setStatus(`Error: ${data.error}`);
        break;
    }
  };

  /**
   * Handle export actions
   */
  const handleExport = (format) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${courseData.courseTitle || 'course'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Handle copy to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      // Show success feedback
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  /**
   * Handle regeneration
   */
  const handleRegenerate = () => {
    setContent('');
    setQualityAnalysis(null);
    setGenerationStats({});
    setRecommendations([]);
    startGeneration();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={cn(
        "bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              AI Course Generation
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {courseData.courseTitle}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-140px)]">
          {/* Left Panel - Controls and Stats */}
          <div className="w-80 border-r p-6 space-y-6 overflow-y-auto">
            {/* Generation Controls */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Generation</h3>
              
              {generationState === 'idle' && (
                <Button 
                  onClick={startGeneration}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Generation
                </Button>
              )}

              {generationState === 'generating' && (
                <StreamingProgress 
                  progress={progress}
                  status={status}
                  phase={phase}
                />
              )}

              {generationState === 'completed' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Generation Complete</span>
                  </div>
                  
                  <Button 
                    onClick={handleRegenerate}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              )}

              {generationState === 'error' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Generation Failed</span>
                  </div>
                  <p className="text-xs text-gray-600">{status}</p>
                  
                  <Button 
                    onClick={startGeneration}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Quality Analysis */}
            {qualityAnalysis && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quality Analysis</h3>
                <QualityScore 
                  score={qualityAnalysis.score}
                  metrics={qualityAnalysis.metrics}
                />
                
                {recommendations.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-medium text-gray-700 mb-2">Recommendations</h4>
                    <div className="space-y-1">
                      {recommendations.slice(0, 3).map((rec, index) => (
                        <div key={index} className="text-xs text-gray-600 flex items-start gap-2">
                          <TrendingUp className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                          <span>{rec.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generation Stats */}
            {Object.keys(generationStats).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Statistics</h3>
                  <GenerationStats stats={generationStats} />
                </div>
              </>
            )}

            {/* Export Options */}
            {generationState === 'completed' && content && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Export</h3>
                  <div className="space-y-2">
                    <Button 
                      onClick={handleCopy}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                    
                    <Button 
                      onClick={() => handleExport('md')}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Markdown
                    </Button>
                    
                    <Button 
                      onClick={() => handleExport('txt')}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Text
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Panel - Content Preview */}
          <div className="flex-1 p-6">
            <ContentPreview 
              content={content}
              isStreaming={generationState === 'generating'}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedCourseGenerationModal;
