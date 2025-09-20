/**
 * Conversational Profiler Component
 * ChatGPT-like interface for capturing user expertise and preferences
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  MessageCircle, 
  User, 
  Bot, 
  ArrowRight, 
  CheckCircle, 
  Sparkles,
  Brain,
  Target,
  Lightbulb
} from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Profiling Questions Configuration
 */
const PROFILING_QUESTIONS = [
  {
    id: 'welcome',
    type: 'intro',
    message: "Hi! I'm here to help create a personalized course generation experience for you. Think of this as a consultation where I learn about your expertise, teaching style, and goals. This will help me generate courses that truly reflect your unique knowledge and perspective.",
    action: 'continue'
  },
  {
    id: 'expertise_field',
    type: 'text',
    message: "Let's start with your area of expertise. What field or industry do you specialize in? This could be anything from 'Digital Marketing' to 'Software Engineering' to 'Sustainable Agriculture'.",
    placeholder: "e.g., Digital Marketing, Software Engineering, Graphic Design...",
    validation: (value) => value.length >= 3 ? null : "Please provide your field of expertise"
  },
  {
    id: 'years_experience',
    type: 'select',
    message: "How many years of experience do you have in this field?",
    options: [
      { value: '0-1', label: 'Less than 1 year' },
      { value: '1-2', label: '1-2 years' },
      { value: '2-5', label: '2-5 years' },
      { value: '5-10', label: '5-10 years' },
      { value: '10+', label: '10+ years' }
    ]
  },
  {
    id: 'current_role',
    type: 'text',
    message: "What's your current role or position? This helps me understand your perspective and the level of expertise you bring.",
    placeholder: "e.g., Senior Marketing Manager, Freelance Designer, Startup Founder..."
  },
  {
    id: 'self_assessment',
    type: 'select',
    message: "How would you assess your current level of expertise in your field?",
    options: [
      { value: 'complete-beginner', label: 'Complete beginner - just starting out' },
      { value: 'some-knowledge', label: 'Some knowledge - learning the basics' },
      { value: 'intermediate', label: 'Intermediate - comfortable with fundamentals' },
      { value: 'advanced', label: 'Advanced - deep knowledge and experience' },
      { value: 'expert', label: 'Expert - recognized authority in the field' }
    ]
  },
  {
    id: 'teaching_style',
    type: 'select',
    message: "What's your preferred teaching or learning style? This will help me structure courses in a way that feels natural to you.",
    options: [
      { value: 'practical', label: 'Practical & Hands-On - Learn by doing real projects' },
      { value: 'theoretical', label: 'Theoretical & Conceptual - Deep understanding first' },
      { value: 'balanced', label: 'Balanced Approach - Mix of theory and practice' },
      { value: 'visual', label: 'Visual & Interactive - Diagrams, charts, and visuals' }
    ]
  },
  {
    id: 'industry_context',
    type: 'select',
    message: "Which industry context best describes your work environment?",
    options: [
      { value: 'technology', label: 'Technology - Fast-paced, tool-focused, innovation-driven' },
      { value: 'business', label: 'Business & Management - Strategy, results, people-oriented' },
      { value: 'creative', label: 'Creative & Design - Process-oriented, inspiration-driven' },
      { value: 'education', label: 'Education & Training - Pedagogy-focused, learner-centered' },
      { value: 'healthcare', label: 'Healthcare & Medical - Evidence-based, safety-focused' },
      { value: 'other', label: 'Other industry' }
    ]
  },
  {
    id: 'target_audience',
    type: 'text',
    message: "Who do you typically teach, mentor, or want to create courses for? Understanding your audience helps me tailor the content appropriately.",
    placeholder: "e.g., Marketing professionals, Small business owners, Design students..."
  },
  {
    id: 'unique_perspective',
    type: 'textarea',
    message: "What makes your approach or perspective unique? This could be a specific methodology, philosophy, or way of thinking that sets you apart.",
    placeholder: "e.g., I focus on data-driven creativity, I emphasize sustainable practices, I use storytelling in technical training..."
  },
  {
    id: 'learning_objectives',
    type: 'textarea',
    message: "What are the main outcomes you want learners to achieve? What should they be able to do after taking your courses?",
    placeholder: "e.g., Build their first mobile app, Launch a successful marketing campaign, Design user-friendly interfaces..."
  },
  {
    id: 'content_preferences',
    type: 'multi-select',
    message: "What types of content and examples do you prefer to include in your teaching?",
    options: [
      { value: 'case-studies', label: 'Real-world case studies' },
      { value: 'step-by-step-guides', label: 'Step-by-step guides' },
      { value: 'frameworks', label: 'Frameworks and models' },
      { value: 'tools-and-software', label: 'Tools and software tutorials' },
      { value: 'industry-examples', label: 'Industry-specific examples' },
      { value: 'personal-stories', label: 'Personal experiences and stories' },
      { value: 'research-data', label: 'Research and data insights' },
      { value: 'interactive-exercises', label: 'Interactive exercises' }
    ]
  },
  {
    id: 'completion',
    type: 'completion',
    message: "Perfect! I now have a comprehensive understanding of your expertise and teaching style. This profile will help me generate courses that truly reflect your unique knowledge and perspective. You can always update these preferences later in your settings.",
    action: 'complete'
  }
];

/**
 * Conversational Profiler Component
 */
export function ConversationalProfiler({ onComplete, onSkip, className }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [currentInput, setCurrentInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversation, setConversation] = useState([]);
  const messagesEndRef = useRef(null);

  const currentQuestion = PROFILING_QUESTIONS[currentQuestionIndex];
  const progress = (currentQuestionIndex / (PROFILING_QUESTIONS.length - 1)) * 100;

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isTyping]);

  // Add initial message when component mounts
  useEffect(() => {
    if (conversation.length === 0) {
      setTimeout(() => {
        addBotMessage(currentQuestion.message);
      }, 500);
    }
  }, []);

  /**
   * Add bot message to conversation
   */
  const addBotMessage = (message) => {
    setIsTyping(true);
    
    // Simulate typing delay
    setTimeout(() => {
      setConversation(prev => [...prev, {
        type: 'bot',
        message,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1000);
  };

  /**
   * Add user message to conversation
   */
  const addUserMessage = (message) => {
    setConversation(prev => [...prev, {
      type: 'user',
      message,
      timestamp: new Date()
    }]);
  };

  /**
   * Handle question response
   */
  const handleResponse = (value) => {
    const question = currentQuestion;
    
    // Validate response if validation function exists
    if (question.validation) {
      const error = question.validation(value);
      if (error) {
        // Show error message
        return;
      }
    }

    // Store response
    setResponses(prev => ({
      ...prev,
      [question.id]: value
    }));

    // Add user message to conversation
    let displayValue = value;
    if (question.type === 'select') {
      const option = question.options.find(opt => opt.value === value);
      displayValue = option ? option.label : value;
    } else if (question.type === 'multi-select') {
      const selectedLabels = question.options
        .filter(opt => value.includes(opt.value))
        .map(opt => opt.label);
      displayValue = selectedLabels.join(', ');
    }
    
    addUserMessage(displayValue);

    // Clear current input
    setCurrentInput('');
    setSelectedOptions([]);

    // Move to next question
    setTimeout(() => {
      if (currentQuestionIndex < PROFILING_QUESTIONS.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        const nextQuestion = PROFILING_QUESTIONS[currentQuestionIndex + 1];
        addBotMessage(nextQuestion.message);
      } else {
        // Profiling complete
        handleComplete();
      }
    }, 1500);
  };

  /**
   * Handle profiling completion
   */
  const handleComplete = () => {
    onComplete(responses);
  };

  /**
   * Handle continue action (for intro/completion messages)
   */
  const handleContinue = () => {
    if (currentQuestion.action === 'continue') {
      setCurrentQuestionIndex(prev => prev + 1);
      const nextQuestion = PROFILING_QUESTIONS[currentQuestionIndex + 1];
      addBotMessage(nextQuestion.message);
    } else if (currentQuestion.action === 'complete') {
      handleComplete();
    }
  };

  /**
   * Handle multi-select option toggle
   */
  const toggleMultiSelectOption = (value) => {
    setSelectedOptions(prev => {
      if (prev.includes(value)) {
        return prev.filter(v => v !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  /**
   * Render input based on question type
   */
  const renderInput = () => {
    if (isTyping) return null;

    switch (currentQuestion.type) {
      case 'intro':
      case 'completion':
        return (
          <div className="flex justify-center">
            <Button 
              onClick={handleContinue}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {currentQuestion.action === 'complete' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Profile
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Let's Start
                </>
              )}
            </Button>
          </div>
        );

      case 'text':
        return (
          <div className="flex gap-2">
            <Input
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder={currentQuestion.placeholder}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && currentInput.trim()) {
                  handleResponse(currentInput.trim());
                }
              }}
              className="flex-1"
              autoFocus
            />
            <Button 
              onClick={() => handleResponse(currentInput.trim())}
              disabled={!currentInput.trim()}
              size="sm"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder={currentQuestion.placeholder}
              rows={3}
              className="resize-none"
              autoFocus
            />
            <div className="flex justify-end">
              <Button 
                onClick={() => handleResponse(currentInput.trim())}
                disabled={!currentInput.trim()}
                size="sm"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue
              </Button>
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                className="w-full justify-start text-left h-auto p-3 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => handleResponse(option.value)}
              >
                <div>
                  <div className="font-medium">{option.label}</div>
                </div>
              </Button>
            ))}
          </div>
        );

      case 'multi-select':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedOptions.includes(option.value) ? "default" : "outline"}
                  className={cn(
                    "w-full justify-start text-left h-auto p-3",
                    selectedOptions.includes(option.value) 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : "hover:bg-blue-50 hover:border-blue-300"
                  )}
                  onClick={() => toggleMultiSelectOption(option.value)}
                >
                  <div className="flex items-center gap-2">
                    {selectedOptions.includes(option.value) && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>{option.label}</span>
                  </div>
                </Button>
              ))}
            </div>
            
            {selectedOptions.length > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-1">
                  {selectedOptions.map(value => {
                    const option = currentQuestion.options.find(opt => opt.value === value);
                    return (
                      <Badge key={value} variant="secondary" className="text-xs">
                        {option?.label}
                      </Badge>
                    );
                  })}
                </div>
                <Button 
                  onClick={() => handleResponse(selectedOptions)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Continue
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("max-w-2xl mx-auto", className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Brain className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Expertise Profiling
            </h2>
            <p className="text-sm text-gray-600">
              Help us understand your expertise to personalize your experience
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Conversation */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {conversation.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  message.type === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.type === 'bot' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-lg",
                    message.type === 'user'
                      ? "bg-blue-600 text-white ml-auto"
                      : "bg-gray-100 text-gray-900"
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.message}</p>
                </div>

                {message.type === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Input Area */}
      <Card>
        <CardContent className="p-4">
          {renderInput()}
        </CardContent>
      </Card>

      {/* Skip Option */}
      <div className="mt-4 text-center">
        <Button 
          variant="ghost" 
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-700"
        >
          Skip profiling for now
        </Button>
      </div>
    </div>
  );
}

export default ConversationalProfiler;
