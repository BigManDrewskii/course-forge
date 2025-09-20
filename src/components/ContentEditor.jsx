/**
 * Content Editor Component
 * In-app content editor with real-time collaboration and AI assistance
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { 
  Edit3, 
  Save, 
  Undo, 
  Redo,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Eye,
  EyeOff,
  Zap,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Users,
  MessageSquare,
  Clock,
  Sparkles,
  FileText,
  Download,
  Share2
} from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Editor Toolbar Component
 */
function EditorToolbar({ 
  onFormat, 
  onAIAssist, 
  isAILoading, 
  canUndo, 
  canRedo, 
  onUndo, 
  onRedo,
  onSave,
  hasUnsavedChanges,
  className 
}) {
  const formatButtons = [
    { icon: Bold, action: 'bold', title: 'Bold (Ctrl+B)', shortcut: 'Ctrl+B' },
    { icon: Italic, action: 'italic', title: 'Italic (Ctrl+I)', shortcut: 'Ctrl+I' },
    { icon: List, action: 'bullet-list', title: 'Bullet List', shortcut: 'Ctrl+Shift+8' },
    { icon: ListOrdered, action: 'numbered-list', title: 'Numbered List', shortcut: 'Ctrl+Shift+7' },
    { icon: Quote, action: 'blockquote', title: 'Quote', shortcut: 'Ctrl+Shift+>' },
    { icon: Code, action: 'code', title: 'Code', shortcut: 'Ctrl+`' },
    { icon: Link, action: 'link', title: 'Link (Ctrl+K)', shortcut: 'Ctrl+K' },
    { icon: Image, action: 'image', title: 'Image', shortcut: 'Ctrl+Shift+I' }
  ];

  return (
    <div className={cn(
      "flex items-center gap-1 p-2 border-b bg-gray-50 rounded-t-lg",
      className
    )}>
      {/* History Controls */}
      <div className="flex items-center gap-1 mr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="h-8 w-8 p-0"
        >
          <Undo className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="h-8 w-8 p-0"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Formatting Controls */}
      <div className="flex items-center gap-1 mr-2">
        {formatButtons.map(({ icon: Icon, action, title, shortcut }) => (
          <Button
            key={action}
            variant="ghost"
            size="sm"
            onClick={() => onFormat(action)}
            title={`${title} ${shortcut ? `(${shortcut})` : ''}`}
            className="h-8 w-8 p-0"
          >
            <Icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* AI Assistance */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAIAssist}
        disabled={isAILoading}
        title="AI Writing Assistant (Ctrl+Space)"
        className="h-8 px-3"
      >
        {isAILoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        AI Assist
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save Controls */}
      <div className="flex items-center gap-2">
        {hasUnsavedChanges && (
          <Badge variant="secondary" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Unsaved
          </Badge>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={!hasUnsavedChanges}
          title="Save (Ctrl+S)"
          className="h-8 px-3"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}

/**
 * AI Assistant Panel Component
 */
function AIAssistantPanel({ 
  isOpen, 
  onClose, 
  selectedText, 
  onApplySuggestion,
  className 
}) {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    { label: 'Improve clarity', prompt: 'Make this text clearer and more concise' },
    { label: 'Add examples', prompt: 'Add practical examples to illustrate this concept' },
    { label: 'Expand section', prompt: 'Expand this section with more detailed information' },
    { label: 'Simplify language', prompt: 'Simplify the language for better understanding' },
    { label: 'Add transitions', prompt: 'Add smooth transitions between paragraphs' },
    { label: 'Create summary', prompt: 'Create a brief summary of this content' }
  ];

  const handleAIRequest = async (customPrompt = prompt) => {
    if (!customPrompt.trim() || !selectedText) return;

    setIsLoading(true);
    setSuggestions([]);

    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selectedText,
          prompt: customPrompt,
          context: 'course_editing'
        }),
      });

      if (!response.ok) throw new Error('AI assistance failed');

      const data = await response.json();
      setSuggestions(data.suggestions || []);

    } catch (error) {
      console.error('AI assistance error:', error);
      setSuggestions([{
        type: 'error',
        content: 'AI assistance is temporarily unavailable. Please try again.',
        confidence: 0
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Card className={cn("absolute top-full left-0 right-0 z-50 mt-2 shadow-lg", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            AI Writing Assistant
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <EyeOff className="w-3 h-3" />
          </Button>
        </div>
        
        {selectedText && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
            <strong>Selected:</strong> {selectedText.slice(0, 100)}
            {selectedText.length > 100 && '...'}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Prompts */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Quick Actions:</p>
          <div className="flex flex-wrap gap-1">
            {quickPrompts.map((item) => (
              <Button
                key={item.label}
                variant="outline"
                size="sm"
                onClick={() => handleAIRequest(item.prompt)}
                disabled={isLoading || !selectedText}
                className="text-xs h-7"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Custom Request:</p>
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to improve..."
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAIRequest();
                }
              }}
            />
            <Button
              onClick={() => handleAIRequest()}
              disabled={isLoading || !prompt.trim() || !selectedText}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Zap className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        {/* AI Suggestions */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            AI is analyzing your content...
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-700">Suggestions:</p>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded border text-sm",
                  suggestion.type === 'error' 
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-blue-50 border-blue-200"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{suggestion.content}</p>
                    {suggestion.confidence && (
                      <div className="flex items-center gap-1 mt-2">
                        <div className="text-xs text-gray-500">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full"
                            style={{ width: `${suggestion.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {suggestion.type !== 'error' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onApplySuggestion(suggestion.content)}
                      className="text-xs"
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Collaboration Panel Component
 */
function CollaborationPanel({ 
  collaborators, 
  comments, 
  onAddComment,
  className 
}) {
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
    }
  };

  return (
    <Card className={cn("w-80", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          Collaboration
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Active Collaborators */}
        {collaborators && collaborators.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              Active ({collaborators.length})
            </p>
            <div className="space-y-2">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: collaborator.color }}
                  >
                    {collaborator.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">{collaborator.name}</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full ml-auto" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">
            Comments ({comments?.length || 0})
          </p>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {comments?.map((comment) => (
              <div key={comment.id} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{comment.author}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-700">{comment.content}</p>
              </div>
            ))}
          </div>

          {/* Add Comment */}
          <div className="mt-3 space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="text-sm resize-none"
              rows={2}
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              size="sm"
              className="w-full"
            >
              <MessageSquare className="w-3 h-3 mr-2" />
              Add Comment
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Content Editor Component
 */
export function ContentEditor({ 
  initialContent = '', 
  metadata = {},
  onSave,
  onExport,
  collaborators = [],
  comments = [],
  className 
}) {
  const [content, setContent] = useState(initialContent);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [history, setHistory] = useState([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isAILoading, setIsAILoading] = useState(false);

  const textareaRef = useRef(null);
  const editorRef = useRef(null);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges) {
        handleSave(true); // Auto-save
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges]);

  // Handle content changes
  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    
    // Add to history if significantly different
    if (newContent !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      
      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setHistoryIndex(historyIndex + 1);
      }
      
      setHistory(newHistory);
    }
  }, [history, historyIndex]);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selected = content.substring(start, end);
      
      if (selected.trim()) {
        setSelectedText(selected);
      }
    }
  }, [content]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'z':
            if (!e.shiftKey) {
              e.preventDefault();
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case ' ':
            e.preventDefault();
            setShowAIAssistant(true);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Handle save
   */
  const handleSave = useCallback(async (isAutoSave = false) => {
    try {
      await onSave?.(content, metadata);
      setHasUnsavedChanges(false);
      
      if (!isAutoSave) {
        // Show success feedback
      }
    } catch (error) {
      console.error('Save failed:', error);
      // Show error feedback
    }
  }, [content, metadata, onSave]);

  /**
   * Handle undo
   */
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  /**
   * Handle redo
   */
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  /**
   * Handle formatting
   */
  const handleFormat = useCallback((action) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let replacement = '';
    let newCursorPos = start;

    switch (action) {
      case 'bold':
        replacement = `**${selectedText}**`;
        newCursorPos = selectedText ? end + 4 : start + 2;
        break;
      case 'italic':
        replacement = `*${selectedText}*`;
        newCursorPos = selectedText ? end + 2 : start + 1;
        break;
      case 'bullet-list':
        replacement = selectedText 
          ? selectedText.split('\n').map(line => `- ${line}`).join('\n')
          : '- ';
        newCursorPos = start + replacement.length;
        break;
      case 'numbered-list':
        replacement = selectedText 
          ? selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n')
          : '1. ';
        newCursorPos = start + replacement.length;
        break;
      case 'blockquote':
        replacement = selectedText 
          ? selectedText.split('\n').map(line => `> ${line}`).join('\n')
          : '> ';
        newCursorPos = start + replacement.length;
        break;
      case 'code':
        replacement = selectedText ? `\`${selectedText}\`` : '``';
        newCursorPos = selectedText ? end + 2 : start + 1;
        break;
      case 'link':
        replacement = selectedText ? `[${selectedText}](url)` : '[text](url)';
        newCursorPos = start + replacement.length - 1;
        break;
      case 'image':
        replacement = selectedText ? `![${selectedText}](url)` : '![alt](url)';
        newCursorPos = start + replacement.length - 1;
        break;
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    handleContentChange(newContent);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content, handleContentChange]);

  /**
   * Handle AI suggestion application
   */
  const handleApplySuggestion = useCallback((suggestion) => {
    if (!textareaRef.current || !selectedText) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newContent = content.substring(0, start) + suggestion + content.substring(end);
    handleContentChange(newContent);
    
    setShowAIAssistant(false);
    setSelectedText('');
  }, [content, selectedText, handleContentChange]);

  /**
   * Handle comment addition
   */
  const handleAddComment = useCallback((commentText) => {
    // In a real implementation, this would send to a collaboration service
    console.log('Adding comment:', commentText);
  }, []);

  return (
    <div className={cn("flex gap-4", className)}>
      {/* Main Editor */}
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {metadata.title || 'Course Content'}
            </h2>
            <p className="text-sm text-gray-600">
              Edit your course content with AI assistance and real-time collaboration
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCollaboration(!showCollaboration)}
              className={cn(
                showCollaboration && "bg-blue-50 border-blue-300 text-blue-700"
              )}
            >
              <Users className="w-4 h-4 mr-2" />
              Collaborate
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              {isPreviewMode ? (
                <>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </>
              )}
            </Button>
            
            <Button
              onClick={() => onExport?.(content, metadata)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="relative" ref={editorRef}>
          <Card className="overflow-hidden">
            <EditorToolbar
              onFormat={handleFormat}
              onAIAssist={() => setShowAIAssistant(!showAIAssistant)}
              isAILoading={isAILoading}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onSave={() => handleSave()}
              hasUnsavedChanges={hasUnsavedChanges}
            />
            
            <CardContent className="p-0">
              {isPreviewMode ? (
                <div className="p-6 prose prose-sm max-w-none">
                  {/* Preview would render markdown here */}
                  <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }} />
                </div>
              ) : (
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onSelect={handleTextSelection}
                  placeholder="Start writing your course content here..."
                  className="min-h-[500px] border-0 rounded-none resize-none focus:ring-0 font-mono text-sm"
                  style={{ fontFamily: 'Monaco, Consolas, monospace' }}
                />
              )}
            </CardContent>
          </Card>

          {/* AI Assistant Panel */}
          <AIAssistantPanel
            isOpen={showAIAssistant}
            onClose={() => setShowAIAssistant(false)}
            selectedText={selectedText}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 px-2">
          <div className="flex items-center gap-4">
            <span>Words: {content.split(/\s+/).filter(w => w).length}</span>
            <span>Characters: {content.length}</span>
            <span>Lines: {content.split('\n').length}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
            
            <span>Last saved: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Collaboration Panel */}
      {showCollaboration && (
        <CollaborationPanel
          collaborators={collaborators}
          comments={comments}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}

export default ContentEditor;
