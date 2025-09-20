/**
 * Advanced Export Modal Component
 * Multiple format export with LMS compatibility and customization options
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { 
  Download, 
  FileText, 
  File, 
  Globe, 
  BookOpen,
  Presentation,
  Code,
  Share2,
  Settings,
  CheckCircle,
  Loader2,
  X,
  Copy,
  ExternalLink,
  Palette,
  Layout,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Export Format Configuration
 */
const EXPORT_FORMATS = {
  markdown: {
    name: 'Markdown',
    description: 'Clean, portable format for documentation',
    icon: FileText,
    extension: 'md',
    mimeType: 'text/markdown',
    features: ['formatting', 'links', 'images', 'tables'],
    platforms: ['GitHub', 'Notion', 'Obsidian', 'Any text editor'],
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  html: {
    name: 'HTML',
    description: 'Web-ready format with styling and interactivity',
    icon: Globe,
    extension: 'html',
    mimeType: 'text/html',
    features: ['styling', 'interactivity', 'responsive', 'embeddable'],
    platforms: ['Any web browser', 'LMS platforms', 'Websites'],
    color: 'bg-orange-50 border-orange-200 text-orange-800'
  },
  pdf: {
    name: 'PDF',
    description: 'Professional document format for printing and sharing',
    icon: File,
    extension: 'pdf',
    mimeType: 'application/pdf',
    features: ['print-ready', 'professional', 'universal', 'secure'],
    platforms: ['Any PDF reader', 'Print', 'Email sharing'],
    color: 'bg-red-50 border-red-200 text-red-800'
  },
  scorm: {
    name: 'SCORM Package',
    description: 'E-learning standard for LMS integration',
    icon: BookOpen,
    extension: 'zip',
    mimeType: 'application/zip',
    features: ['lms-compatible', 'tracking', 'interactive', 'standards-compliant'],
    platforms: ['Moodle', 'Canvas', 'Blackboard', 'Most LMS'],
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  presentation: {
    name: 'Presentation',
    description: 'Slide deck format for teaching and presenting',
    icon: Presentation,
    extension: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    features: ['slides', 'animations', 'speaker-notes', 'templates'],
    platforms: ['PowerPoint', 'Google Slides', 'Keynote'],
    color: 'bg-purple-50 border-purple-200 text-purple-800'
  },
  json: {
    name: 'Structured Data',
    description: 'Machine-readable format for developers',
    icon: Code,
    extension: 'json',
    mimeType: 'application/json',
    features: ['structured', 'api-ready', 'parseable', 'lightweight'],
    platforms: ['APIs', 'Databases', 'Custom applications'],
    color: 'bg-gray-50 border-gray-200 text-gray-800'
  }
};

/**
 * Export Format Card Component
 */
function ExportFormatCard({ 
  format, 
  config, 
  isSelected, 
  onSelect, 
  className 
}) {
  const Icon = config.icon;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected ? "ring-2 ring-blue-500 border-blue-300" : "hover:border-gray-300",
        className
      )}
      onClick={() => onSelect(format)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", config.color.split(' ')[0])}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900">{config.name}</h3>
              {isSelected && (
                <CheckCircle className="w-4 h-4 text-blue-600" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{config.description}</p>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {config.features.slice(0, 3).map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
              {config.features.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{config.features.length - 3}
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-gray-500">
              Works with: {config.platforms.slice(0, 2).join(', ')}
              {config.platforms.length > 2 && ` +${config.platforms.length - 2} more`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Export Options Component
 */
function ExportOptions({ format, options, onChange, className }) {
  const config = EXPORT_FORMATS[format];
  
  if (!config) return null;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="w-4 h-4" />
          {config.name} Options
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Common Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include-metadata"
              checked={options.includeMetadata}
              onCheckedChange={(checked) => onChange({ ...options, includeMetadata: checked })}
            />
            <Label htmlFor="include-metadata" className="text-sm">
              Include course metadata (title, author, date)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include-toc"
              checked={options.includeTableOfContents}
              onCheckedChange={(checked) => onChange({ ...options, includeTableOfContents: checked })}
            />
            <Label htmlFor="include-toc" className="text-sm">
              Generate table of contents
            </Label>
          </div>
        </div>

        {/* Format-specific options */}
        {format === 'html' && (
          <div className="space-y-3">
            <Separator />
            <h4 className="text-sm font-medium">HTML Options</h4>
            
            <div className="space-y-2">
              <Label htmlFor="theme" className="text-sm">Theme</Label>
              <RadioGroup 
                value={options.theme || 'modern'}
                onValueChange={(value) => onChange({ ...options, theme: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="modern" id="theme-modern" />
                  <Label htmlFor="theme-modern" className="text-sm">Modern</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="minimal" id="theme-minimal" />
                  <Label htmlFor="theme-minimal" className="text-sm">Minimal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="academic" id="theme-academic" />
                  <Label htmlFor="theme-academic" className="text-sm">Academic</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="responsive"
                checked={options.responsive !== false}
                onCheckedChange={(checked) => onChange({ ...options, responsive: checked })}
              />
              <Label htmlFor="responsive" className="text-sm">
                Mobile responsive design
              </Label>
            </div>
          </div>
        )}

        {format === 'pdf' && (
          <div className="space-y-3">
            <Separator />
            <h4 className="text-sm font-medium">PDF Options</h4>
            
            <div className="space-y-2">
              <Label htmlFor="page-size" className="text-sm">Page Size</Label>
              <RadioGroup 
                value={options.pageSize || 'a4'}
                onValueChange={(value) => onChange({ ...options, pageSize: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="a4" id="size-a4" />
                  <Label htmlFor="size-a4" className="text-sm">A4</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="letter" id="size-letter" />
                  <Label htmlFor="size-letter" className="text-sm">Letter</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="page-numbers"
                checked={options.pageNumbers !== false}
                onCheckedChange={(checked) => onChange({ ...options, pageNumbers: checked })}
              />
              <Label htmlFor="page-numbers" className="text-sm">
                Include page numbers
              </Label>
            </div>
          </div>
        )}

        {format === 'scorm' && (
          <div className="space-y-3">
            <Separator />
            <h4 className="text-sm font-medium">SCORM Options</h4>
            
            <div className="space-y-2">
              <Label htmlFor="scorm-version" className="text-sm">SCORM Version</Label>
              <RadioGroup 
                value={options.scormVersion || '2004'}
                onValueChange={(value) => onChange({ ...options, scormVersion: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1.2" id="scorm-1.2" />
                  <Label htmlFor="scorm-1.2" className="text-sm">SCORM 1.2</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2004" id="scorm-2004" />
                  <Label htmlFor="scorm-2004" className="text-sm">SCORM 2004</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="completion-tracking"
                checked={options.completionTracking !== false}
                onCheckedChange={(checked) => onChange({ ...options, completionTracking: checked })}
              />
              <Label htmlFor="completion-tracking" className="text-sm">
                Enable completion tracking
              </Label>
            </div>
          </div>
        )}

        {/* Custom filename */}
        <div className="space-y-2">
          <Label htmlFor="filename" className="text-sm">Custom Filename</Label>
          <Input
            id="filename"
            value={options.filename || ''}
            onChange={(e) => onChange({ ...options, filename: e.target.value })}
            placeholder={`course.${config.extension}`}
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Advanced Export Modal Component
 */
export function AdvancedExportModal({ 
  isOpen, 
  onClose, 
  courseContent, 
  courseMetadata,
  className 
}) {
  const [selectedFormat, setSelectedFormat] = useState('markdown');
  const [exportOptions, setExportOptions] = useState({
    includeMetadata: true,
    includeTableOfContents: true,
    filename: '',
    theme: 'modern',
    responsive: true,
    pageSize: 'a4',
    pageNumbers: true,
    scormVersion: '2004',
    completionTracking: true
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportResult, setExportResult] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setExportResult(null);
      setExportProgress(0);
    }
  }, [isOpen]);

  /**
   * Handle export process
   */
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Prepare export data
      const exportData = {
        content: courseContent,
        metadata: courseMetadata,
        format: selectedFormat,
        options: exportOptions
      };

      // Start export process
      const response = await fetch('/api/export/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Handle streaming progress
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
              
              if (data.type === 'progress') {
                setExportProgress(data.progress);
              } else if (data.type === 'complete') {
                setExportResult({
                  success: true,
                  downloadUrl: data.downloadUrl,
                  filename: data.filename,
                  size: data.size,
                  format: selectedFormat
                });
              }
            } catch (e) {
              console.error('Error parsing export progress:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error('Export error:', error);
      setExportResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle download
   */
  const handleDownload = () => {
    if (exportResult?.downloadUrl) {
      const link = document.createElement('a');
      link.href = exportResult.downloadUrl;
      link.download = exportResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  /**
   * Handle share
   */
  const handleShare = async () => {
    if (exportResult?.downloadUrl) {
      try {
        await navigator.clipboard.writeText(exportResult.downloadUrl);
        // Show success feedback
      } catch (error) {
        console.error('Failed to copy share link:', error);
      }
    }
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
              Export Course
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose format and customize export options
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-140px)]">
          {/* Left Panel - Format Selection */}
          <div className="w-80 border-r p-6 space-y-4 overflow-y-auto">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Export Format
              </h3>
              
              <div className="space-y-3">
                {Object.entries(EXPORT_FORMATS).map(([format, config]) => (
                  <ExportFormatCard
                    key={format}
                    format={format}
                    config={config}
                    isSelected={selectedFormat === format}
                    onSelect={setSelectedFormat}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Options and Export */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Export Options */}
            <ExportOptions
              format={selectedFormat}
              options={exportOptions}
              onChange={setExportOptions}
            />

            {/* Export Progress */}
            {isExporting && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-sm font-medium text-blue-900">
                      Exporting course...
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>Progress</span>
                      <span>{Math.round(exportProgress)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export Result */}
            {exportResult && (
              <Card className={cn(
                exportResult.success 
                  ? "border-green-200 bg-green-50" 
                  : "border-red-200 bg-red-50"
              )}>
                <CardContent className="p-4">
                  {exportResult.success ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">
                          Export completed successfully!
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <p className="text-xs text-green-700">
                          <strong>File:</strong> {exportResult.filename}
                        </p>
                        <p className="text-xs text-green-700">
                          <strong>Size:</strong> {exportResult.size}
                        </p>
                        <p className="text-xs text-green-700">
                          <strong>Format:</strong> {EXPORT_FORMATS[exportResult.format].name}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleDownload}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Download className="w-3 h-3 mr-2" />
                          Download
                        </Button>
                        
                        <Button 
                          onClick={handleShare}
                          size="sm"
                          variant="outline"
                        >
                          <Copy className="w-3 h-3 mr-2" />
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <X className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium text-red-900">
                          Export failed
                        </span>
                      </div>
                      <p className="text-xs text-red-700">{exportResult.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Export Button */}
            {!isExporting && !exportResult && (
              <div className="flex justify-end">
                <Button 
                  onClick={handleExport}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Export Course
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedExportModal;
