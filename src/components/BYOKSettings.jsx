/**
 * BYOK (Bring Your Own Key) Settings Component
 * Secure API key management with validation and testing
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Shield,
  Trash2,
  TestTube,
  Info,
  ExternalLink,
  Copy,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Provider Configuration
 */
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, and other OpenAI models',
    keyFormat: 'sk-proj-...',
    keyPattern: /^sk-(proj-)?[a-zA-Z0-9]{20,}$/,
    testEndpoint: 'https://api.openai.com/v1/models',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: 'bg-green-50 border-green-200 text-green-800',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Haiku, and other Claude models',
    keyFormat: 'sk-ant-api03-...',
    keyPattern: /^sk-ant-api03-[a-zA-Z0-9_-]{95}$/,
    testEndpoint: 'https://api.anthropic.com/v1/messages',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229']
  },
  google: {
    name: 'Google AI',
    description: 'Gemini Pro, Gemini Flash, and other Google models',
    keyFormat: 'AIza...',
    keyPattern: /^AIza[a-zA-Z0-9_-]{35}$/,
    testEndpoint: 'https://generativelanguage.googleapis.com/v1/models',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']
  }
};

/**
 * API Key Input Component
 */
function ApiKeyInput({ 
  provider, 
  value, 
  onChange, 
  onTest, 
  isValid, 
  isLoading, 
  error,
  className 
}) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const providerConfig = PROVIDERS[provider];
  const maskedValue = value ? `${value.slice(0, 8)}${'•'.repeat(Math.max(0, value.length - 12))}${value.slice(-4)}` : '';

  const handleCopy = async () => {
    if (value) {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const getValidationState = () => {
    if (!value) return 'empty';
    if (isLoading) return 'testing';
    if (error) return 'error';
    if (isValid) return 'valid';
    return 'invalid';
  };

  const validationState = getValidationState();

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", providerConfig.color.split(' ')[0])} />
            {providerConfig.name}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {validationState === 'valid' && (
              <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
            
            {validationState === 'error' && (
              <Badge variant="secondary" className="text-xs bg-red-50 text-red-700 border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Error
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => window.open(providerConfig.docsUrl, '_blank')}
              title="View API documentation"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-gray-600">{providerConfig.description}</p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`${provider}-key`} className="text-xs font-medium">
            API Key
          </Label>
          
          <div className="relative">
            <Input
              id={`${provider}-key`}
              type={showKey ? 'text' : 'password'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={providerConfig.keyFormat}
              className={cn(
                "pr-20 text-sm",
                validationState === 'valid' && "border-green-300 focus:border-green-500",
                validationState === 'error' && "border-red-300 focus:border-red-500"
              )}
              autoComplete="off"
              spellCheck={false}
            />
            
            <div className="absolute right-1 top-1 flex items-center gap-1">
              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleCopy}
                  title="Copy API key"
                >
                  <Copy className={cn("w-3 h-3", copied && "text-green-600")} />
                </Button>
              )}
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          
          {!showKey && value && (
            <p className="text-xs text-gray-500 font-mono">
              {maskedValue}
            </p>
          )}
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-xs text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => onTest(provider, value)}
            disabled={!value || isLoading || !providerConfig.keyPattern.test(value)}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="w-3 h-3 mr-2" />
                Test Connection
              </>
            )}
          </Button>
          
          {value && (
            <Button
              onClick={() => onChange('')}
              size="sm"
              variant="outline"
              className="px-3"
              title="Remove API key"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>

        {isValid && (
          <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle className="w-3 h-3" />
              <span className="font-medium">Connection verified</span>
            </div>
            <p>Available models: {providerConfig.models.slice(0, 2).join(', ')}
              {providerConfig.models.length > 2 && ` +${providerConfig.models.length - 2} more`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * BYOK Settings Component
 */
export function BYOKSettings({ className }) {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: ''
  });
  
  const [validationStates, setValidationStates] = useState({
    openai: { isValid: false, isLoading: false, error: null },
    anthropic: { isValid: false, isLoading: false, error: null },
    google: { isValid: false, isLoading: false, error: null }
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved API keys on mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  /**
   * Load API keys from secure storage
   */
  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/settings/byok');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys || {});
        
        // Validate loaded keys
        Object.entries(data.keys || {}).forEach(([provider, key]) => {
          if (key) {
            testApiKey(provider, key);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  /**
   * Update API key
   */
  const updateApiKey = (provider, key) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: key
    }));
    
    setValidationStates(prev => ({
      ...prev,
      [provider]: { isValid: false, isLoading: false, error: null }
    }));
    
    setHasChanges(true);
  };

  /**
   * Test API key functionality
   */
  const testApiKey = async (provider, key) => {
    if (!key || !PROVIDERS[provider].keyPattern.test(key)) {
      setValidationStates(prev => ({
        ...prev,
        [provider]: { isValid: false, isLoading: false, error: 'Invalid key format' }
      }));
      return;
    }

    setValidationStates(prev => ({
      ...prev,
      [provider]: { isValid: false, isLoading: true, error: null }
    }));

    try {
      const response = await fetch('/api/settings/byok/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, apiKey: key }),
      });

      const result = await response.json();

      if (response.ok && result.valid) {
        setValidationStates(prev => ({
          ...prev,
          [provider]: { isValid: true, isLoading: false, error: null }
        }));
      } else {
        setValidationStates(prev => ({
          ...prev,
          [provider]: { 
            isValid: false, 
            isLoading: false, 
            error: result.error || 'API key validation failed' 
          }
        }));
      }
    } catch (error) {
      setValidationStates(prev => ({
        ...prev,
        [provider]: { 
          isValid: false, 
          isLoading: false, 
          error: 'Network error during validation' 
        }
      }));
    }
  };

  /**
   * Save API keys
   */
  const saveApiKeys = async () => {
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/settings/byok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keys: apiKeys }),
      });

      if (response.ok) {
        setHasChanges(false);
        // Show success feedback
      } else {
        throw new Error('Failed to save API keys');
      }
    } catch (error) {
      console.error('Failed to save API keys:', error);
      // Show error feedback
    } finally {
      setIsSaving(false);
    }
  };

  const activeProviders = Object.entries(validationStates)
    .filter(([_, state]) => state.isValid)
    .length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            Bring Your Own Key
          </h2>
          <p className="text-gray-600 mt-1">
            Use your own AI provider API keys for enhanced privacy and cost control
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Shield className="w-3 h-3 mr-1" />
            {activeProviders} active
          </Badge>
        </div>
      </div>

      {/* Benefits Info */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          <strong>Benefits of BYOK:</strong> Enhanced privacy (your data never touches our AI services), 
          transparent costs (pay providers directly), higher rate limits, and access to latest models.
        </AlertDescription>
      </Alert>

      {/* API Key Inputs */}
      <div className="grid gap-4">
        {Object.entries(PROVIDERS).map(([provider, config]) => (
          <ApiKeyInput
            key={provider}
            provider={provider}
            value={apiKeys[provider]}
            onChange={(value) => updateApiKey(provider, value)}
            onTest={testApiKey}
            isValid={validationStates[provider].isValid}
            isLoading={validationStates[provider].isLoading}
            error={validationStates[provider].error}
          />
        ))}
      </div>

      <Separator />

      {/* Security Information */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Encryption</h4>
              <ul className="space-y-1 text-xs">
                <li>• AES-256-GCM encryption at rest</li>
                <li>• TLS 1.3 encryption in transit</li>
                <li>• Keys never logged or cached</li>
                <li>• Automatic key rotation support</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Privacy</h4>
              <ul className="space-y-1 text-xs">
                <li>• Direct API communication</li>
                <li>• No data interception</li>
                <li>• Your usage, your control</li>
                <li>• Audit logs available</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes */}
      {hasChanges && (
        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">You have unsaved changes</span>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadApiKeys();
                setHasChanges(false);
              }}
            >
              Cancel
            </Button>
            
            <Button
              onClick={saveApiKeys}
              disabled={isSaving}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Settings className="w-3 h-3 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BYOKSettings;
