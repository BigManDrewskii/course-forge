/**
 * Export Manager
 * Handles course export in multiple formats with progress tracking
 */

import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

/**
 * Export Manager Class
 */
export class ExportManager {
  constructor() {
    this.exportDir = process.env.EXPORT_DIR || '/tmp/exports';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Ensure export directory exists
    this.ensureExportDir();
  }

  /**
   * Ensure export directory exists
   */
  async ensureExportDir() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats() {
    return [
      'markdown',
      'html', 
      'pdf',
      'scorm',
      'presentation',
      'json'
    ];
  }

  /**
   * Generate export in specified format
   */
  async generateExport({ content, metadata, format, options, userId, onProgress }) {
    const exportId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Default filename
    const defaultFilename = options.filename || 
      `${metadata?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'course'}-${timestamp}`;

    onProgress?.(10, 'Preparing export...');

    try {
      switch (format) {
        case 'markdown':
          return await this.exportMarkdown({ content, metadata, options, exportId, defaultFilename, onProgress });
        
        case 'html':
          return await this.exportHTML({ content, metadata, options, exportId, defaultFilename, onProgress });
        
        case 'pdf':
          return await this.exportPDF({ content, metadata, options, exportId, defaultFilename, onProgress });
        
        case 'scorm':
          return await this.exportSCORM({ content, metadata, options, exportId, defaultFilename, onProgress });
        
        case 'presentation':
          return await this.exportPresentation({ content, metadata, options, exportId, defaultFilename, onProgress });
        
        case 'json':
          return await this.exportJSON({ content, metadata, options, exportId, defaultFilename, onProgress });
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error(`Export failed for format ${format}:`, error);
      throw error;
    }
  }

  /**
   * Export as Markdown
   */
  async exportMarkdown({ content, metadata, options, exportId, defaultFilename, onProgress }) {
    onProgress?.(30, 'Processing markdown content...');

    let markdownContent = '';

    // Add metadata if requested
    if (options.includeMetadata && metadata) {
      markdownContent += this.generateMetadataSection(metadata);
      markdownContent += '\n\n---\n\n';
    }

    // Add table of contents if requested
    if (options.includeTableOfContents) {
      onProgress?.(50, 'Generating table of contents...');
      markdownContent += this.generateTableOfContents(content);
      markdownContent += '\n\n---\n\n';
    }

    // Add main content
    onProgress?.(70, 'Adding course content...');
    markdownContent += content;

    // Write to file
    onProgress?.(90, 'Saving file...');
    const filename = `${defaultFilename}.md`;
    const filepath = path.join(this.exportDir, filename);
    
    await fs.writeFile(filepath, markdownContent, 'utf8');

    const stats = await fs.stat(filepath);
    const downloadUrl = `${this.baseUrl}/api/export/download/${filename}`;

    onProgress?.(100, 'Export complete!');

    return {
      downloadUrl,
      filename,
      size: this.formatFileSize(stats.size),
      format: 'markdown'
    };
  }

  /**
   * Export as HTML
   */
  async exportHTML({ content, metadata, options, exportId, defaultFilename, onProgress }) {
    onProgress?.(30, 'Converting markdown to HTML...');

    // Configure marked for better HTML output
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      headerPrefix: 'section-'
    });

    let htmlContent = marked(content);

    onProgress?.(50, 'Applying theme and styling...');

    // Generate complete HTML document
    const html = this.generateHTMLDocument({
      content: htmlContent,
      metadata,
      options,
      onProgress
    });

    onProgress?.(90, 'Saving HTML file...');
    const filename = `${defaultFilename}.html`;
    const filepath = path.join(this.exportDir, filename);
    
    await fs.writeFile(filepath, html, 'utf8');

    const stats = await fs.stat(filepath);
    const downloadUrl = `${this.baseUrl}/api/export/download/${filename}`;

    onProgress?.(100, 'HTML export complete!');

    return {
      downloadUrl,
      filename,
      size: this.formatFileSize(stats.size),
      format: 'html'
    };
  }

  /**
   * Export as PDF
   */
  async exportPDF({ content, metadata, options, exportId, defaultFilename, onProgress }) {
    onProgress?.(20, 'Starting PDF generation...');

    // First generate HTML
    const htmlResult = await this.exportHTML({ 
      content, 
      metadata, 
      options: { ...options, theme: 'academic' }, 
      exportId, 
      defaultFilename: `${defaultFilename}-temp`,
      onProgress: (progress) => onProgress?.(20 + progress * 0.3, 'Preparing HTML for PDF...')
    });

    onProgress?.(50, 'Launching PDF generator...');

    let browser;
    try {
      // Launch headless browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      onProgress?.(60, 'Loading content...');
      
      // Load the HTML content
      const htmlPath = path.join(this.exportDir, `${defaultFilename}-temp.html`);
      await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

      onProgress?.(80, 'Generating PDF...');

      // Generate PDF
      const pdfOptions = {
        format: options.pageSize || 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        }
      };

      if (options.pageNumbers) {
        pdfOptions.displayHeaderFooter = true;
        pdfOptions.headerTemplate = '<div></div>';
        pdfOptions.footerTemplate = `
          <div style="font-size: 10px; text-align: center; width: 100%;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `;
      }

      const pdfBuffer = await page.pdf(pdfOptions);

      onProgress?.(95, 'Saving PDF file...');

      // Save PDF
      const filename = `${defaultFilename}.pdf`;
      const filepath = path.join(this.exportDir, filename);
      
      await fs.writeFile(filepath, pdfBuffer);

      // Clean up temp HTML file
      await fs.unlink(htmlPath).catch(() => {});

      const stats = await fs.stat(filepath);
      const downloadUrl = `${this.baseUrl}/api/export/download/${filename}`;

      onProgress?.(100, 'PDF export complete!');

      return {
        downloadUrl,
        filename,
        size: this.formatFileSize(stats.size),
        format: 'pdf'
      };

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Export as SCORM package
   */
  async exportSCORM({ content, metadata, options, exportId, defaultFilename, onProgress }) {
    onProgress?.(20, 'Creating SCORM package structure...');

    const zip = new JSZip();
    const scormVersion = options.scormVersion || '2004';

    // Generate HTML content for SCORM
    onProgress?.(40, 'Generating course content...');
    const htmlContent = await this.generateSCORMContent({ content, metadata, options });

    // Add SCORM files
    onProgress?.(60, 'Adding SCORM manifest...');
    
    // imsmanifest.xml
    const manifest = this.generateSCORMManifest({ metadata, scormVersion, options });
    zip.file('imsmanifest.xml', manifest);

    // Main content file
    zip.file('index.html', htmlContent);

    // SCORM API files
    if (scormVersion === '1.2') {
      zip.file('APIWrapper.js', this.getSCORM12API());
    } else {
      zip.file('SCORM_API_wrapper.js', this.getSCORM2004API());
    }

    // Add CSS and assets
    zip.file('styles.css', this.getSCORMStyles());

    onProgress?.(80, 'Compressing SCORM package...');

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    onProgress?.(95, 'Saving SCORM package...');

    // Save ZIP file
    const filename = `${defaultFilename}.zip`;
    const filepath = path.join(this.exportDir, filename);
    
    await fs.writeFile(filepath, zipBuffer);

    const stats = await fs.stat(filepath);
    const downloadUrl = `${this.baseUrl}/api/export/download/${filename}`;

    onProgress?.(100, 'SCORM export complete!');

    return {
      downloadUrl,
      filename,
      size: this.formatFileSize(stats.size),
      format: 'scorm'
    };
  }

  /**
   * Export as Presentation
   */
  async exportPresentation({ content, metadata, options, exportId, defaultFilename, onProgress }) {
    onProgress?.(30, 'Parsing content into slides...');

    // Parse content into slides (split by ## headers)
    const slides = this.parseContentIntoSlides(content);

    onProgress?.(50, 'Generating presentation...');

    // For now, generate HTML presentation
    // In production, you might use libraries like officegen for PPTX
    const presentationHTML = this.generatePresentationHTML({ slides, metadata, options });

    onProgress?.(80, 'Saving presentation...');

    const filename = `${defaultFilename}.html`;
    const filepath = path.join(this.exportDir, filename);
    
    await fs.writeFile(filepath, presentationHTML, 'utf8');

    const stats = await fs.stat(filepath);
    const downloadUrl = `${this.baseUrl}/api/export/download/${filename}`;

    onProgress?.(100, 'Presentation export complete!');

    return {
      downloadUrl,
      filename,
      size: this.formatFileSize(stats.size),
      format: 'presentation'
    };
  }

  /**
   * Export as JSON
   */
  async exportJSON({ content, metadata, options, exportId, defaultFilename, onProgress }) {
    onProgress?.(30, 'Structuring course data...');

    // Parse content into structured data
    const structuredData = this.parseContentToStructuredData(content);

    onProgress?.(60, 'Building JSON structure...');

    const jsonData = {
      ...(options.includeMetadata && metadata ? { metadata } : {}),
      content: structuredData,
      exportInfo: {
        exportId,
        timestamp: new Date().toISOString(),
        format: 'json',
        version: '1.0'
      }
    };

    onProgress?.(80, 'Formatting JSON...');

    const jsonString = options.pretty 
      ? JSON.stringify(jsonData, null, 2)
      : JSON.stringify(jsonData);

    onProgress?.(95, 'Saving JSON file...');

    const filename = `${defaultFilename}.json`;
    const filepath = path.join(this.exportDir, filename);
    
    await fs.writeFile(filepath, jsonString, 'utf8');

    const stats = await fs.stat(filepath);
    const downloadUrl = `${this.baseUrl}/api/export/download/${filename}`;

    onProgress?.(100, 'JSON export complete!');

    return {
      downloadUrl,
      filename,
      size: this.formatFileSize(stats.size),
      format: 'json'
    };
  }

  /**
   * Generate metadata section
   */
  generateMetadataSection(metadata) {
    let section = '# Course Information\n\n';
    
    if (metadata.title) section += `**Title:** ${metadata.title}\n\n`;
    if (metadata.author) section += `**Author:** ${metadata.author}\n\n`;
    if (metadata.description) section += `**Description:** ${metadata.description}\n\n`;
    if (metadata.duration) section += `**Duration:** ${metadata.duration}\n\n`;
    if (metadata.difficulty) section += `**Difficulty:** ${metadata.difficulty}\n\n`;
    if (metadata.createdAt) section += `**Created:** ${new Date(metadata.createdAt).toLocaleDateString()}\n\n`;
    
    return section;
  }

  /**
   * Generate table of contents
   */
  generateTableOfContents(content) {
    const lines = content.split('\n');
    const toc = ['# Table of Contents\n'];
    
    lines.forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2];
        const indent = '  '.repeat(level - 1);
        const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        toc.push(`${indent}- [${title}](#${anchor})`);
      }
    });
    
    return toc.join('\n');
  }

  /**
   * Generate complete HTML document
   */
  generateHTMLDocument({ content, metadata, options }) {
    const theme = options.theme || 'modern';
    const responsive = options.responsive !== false;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata?.title || 'Course'}</title>
    <style>
        ${this.getHTMLStyles(theme, responsive)}
    </style>
</head>
<body>
    <div class="container">
        ${options.includeMetadata && metadata ? this.generateHTMLMetadata(metadata) : ''}
        <main class="content">
            ${content}
        </main>
    </div>
</body>
</html>`;
  }

  /**
   * Get HTML styles for different themes
   */
  getHTMLStyles(theme, responsive) {
    const baseStyles = `
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            margin: 0; 
            padding: 0;
            color: #333;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 2rem;
        }
        h1, h2, h3, h4, h5, h6 { 
            margin-top: 2rem; 
            margin-bottom: 1rem;
            font-weight: 600;
        }
        h1 { font-size: 2.5rem; }
        h2 { font-size: 2rem; }
        h3 { font-size: 1.5rem; }
        p { margin-bottom: 1rem; }
        code { 
            background: #f5f5f5; 
            padding: 0.2rem 0.4rem; 
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        pre { 
            background: #f5f5f5; 
            padding: 1rem; 
            border-radius: 5px; 
            overflow-x: auto;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 1rem 0;
            padding-left: 1rem;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 0.5rem;
            text-align: left;
        }
        th { background: #f5f5f5; }
    `;

    const themeStyles = {
      modern: `
        body { background: #fff; }
        h1, h2, h3 { color: #2563eb; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `,
      minimal: `
        body { background: #fafafa; }
        h1, h2, h3 { color: #1f2937; }
        a { color: #374151; }
      `,
      academic: `
        body { background: #fff; font-family: 'Times New Roman', serif; }
        h1, h2, h3 { color: #1f2937; }
        a { color: #1f2937; }
        .container { max-width: 700px; }
      `
    };

    const responsiveStyles = responsive ? `
        @media (max-width: 768px) {
            .container { padding: 1rem; }
            h1 { font-size: 2rem; }
            h2 { font-size: 1.5rem; }
        }
    ` : '';

    return baseStyles + (themeStyles[theme] || themeStyles.modern) + responsiveStyles;
  }

  /**
   * Generate HTML metadata section
   */
  generateHTMLMetadata(metadata) {
    return `
        <header class="metadata">
            <h1>${metadata.title || 'Course'}</h1>
            ${metadata.author ? `<p><strong>Author:</strong> ${metadata.author}</p>` : ''}
            ${metadata.description ? `<p><strong>Description:</strong> ${metadata.description}</p>` : ''}
            ${metadata.duration ? `<p><strong>Duration:</strong> ${metadata.duration}</p>` : ''}
            ${metadata.difficulty ? `<p><strong>Difficulty:</strong> ${metadata.difficulty}</p>` : ''}
            <hr>
        </header>
    `;
  }

  /**
   * Parse content into slides for presentations
   */
  parseContentIntoSlides(content) {
    const lines = content.split('\n');
    const slides = [];
    let currentSlide = { title: '', content: [] };

    lines.forEach(line => {
      if (line.match(/^##\s+/)) {
        // New slide
        if (currentSlide.title || currentSlide.content.length > 0) {
          slides.push(currentSlide);
        }
        currentSlide = { 
          title: line.replace(/^##\s+/, ''), 
          content: [] 
        };
      } else if (line.trim()) {
        currentSlide.content.push(line);
      }
    });

    // Add last slide
    if (currentSlide.title || currentSlide.content.length > 0) {
      slides.push(currentSlide);
    }

    return slides;
  }

  /**
   * Generate presentation HTML
   */
  generatePresentationHTML({ slides, metadata, options }) {
    const slideHTML = slides.map((slide, index) => `
        <div class="slide" data-slide="${index}">
            <h2>${slide.title}</h2>
            <div class="slide-content">
                ${marked(slide.content.join('\n'))}
            </div>
        </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata?.title || 'Presentation'}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; 
            background: #f5f5f5;
        }
        .presentation { 
            max-width: 1000px; 
            margin: 0 auto; 
            padding: 2rem;
        }
        .slide {
            background: white;
            padding: 3rem;
            margin-bottom: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            min-height: 400px;
        }
        .slide h2 {
            color: #2563eb;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }
        .slide-content {
            font-size: 1.1rem;
            line-height: 1.8;
        }
    </style>
</head>
<body>
    <div class="presentation">
        ${slideHTML}
    </div>
</body>
</html>`;
  }

  /**
   * Parse content to structured data
   */
  parseContentToStructuredData(content) {
    const lines = content.split('\n');
    const structure = { sections: [] };
    let currentSection = null;

    lines.forEach(line => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2];
        
        if (level === 1) {
          currentSection = { title, level, content: [], subsections: [] };
          structure.sections.push(currentSection);
        } else if (currentSection) {
          const subsection = { title, level, content: [] };
          currentSection.subsections.push(subsection);
        }
      } else if (line.trim() && currentSection) {
        if (currentSection.subsections.length > 0) {
          const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
          lastSubsection.content.push(line);
        } else {
          currentSection.content.push(line);
        }
      }
    });

    return structure;
  }

  /**
   * Generate SCORM manifest
   */
  generateSCORMManifest({ metadata, scormVersion, options }) {
    const identifier = `course_${Date.now()}`;
    
    if (scormVersion === '1.2') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${identifier}" version="1.0" 
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="default_org">
    <organization identifier="default_org">
      <title>${metadata?.title || 'Course'}</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>${metadata?.title || 'Course'}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="APIWrapper.js"/>
      <file href="styles.css"/>
    </resource>
  </resources>
</manifest>`;
    } else {
      return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${identifier}" version="1.0"
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="default_org">
    <organization identifier="default_org">
      <title>${metadata?.title || 'Course'}</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>${metadata?.title || 'Course'}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
      <file href="SCORM_API_wrapper.js"/>
      <file href="styles.css"/>
    </resource>
  </resources>
</manifest>`;
    }
  }

  /**
   * Generate SCORM content HTML
   */
  async generateSCORMContent({ content, metadata, options }) {
    const htmlContent = marked(content);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata?.title || 'Course'}</title>
    <link rel="stylesheet" href="styles.css">
    <script src="${options.scormVersion === '1.2' ? 'APIWrapper.js' : 'SCORM_API_wrapper.js'}"></script>
</head>
<body onload="doStart()" onunload="doUnload()">
    <div class="scorm-content">
        ${htmlContent}
    </div>
    
    <script>
        function doStart() {
            if (typeof pipwerks !== 'undefined') {
                pipwerks.SCORM.init();
                pipwerks.SCORM.set("cmi.core.lesson_status", "incomplete");
            }
        }
        
        function doUnload() {
            if (typeof pipwerks !== 'undefined') {
                pipwerks.SCORM.set("cmi.core.lesson_status", "completed");
                pipwerks.SCORM.quit();
            }
        }
    </script>
</body>
</html>`;
  }

  /**
   * Get SCORM 1.2 API wrapper
   */
  getSCORM12API() {
    return `// SCORM 1.2 API Wrapper - Simplified version
var API = null;
function findAPI(win) {
    var findAttempts = 0;
    while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
        findAttempts++;
        if (findAttempts > 7) return null;
        win = win.parent;
    }
    return win.API;
}
function getAPI() {
    if (API == null) API = findAPI(window);
    return API;
}
function doStart() {
    var api = getAPI();
    if (api != null) {
        api.LMSInitialize("");
        api.LMSSetValue("cmi.core.lesson_status", "incomplete");
    }
}
function doUnload() {
    var api = getAPI();
    if (api != null) {
        api.LMSSetValue("cmi.core.lesson_status", "completed");
        api.LMSFinish("");
    }
}`;
  }

  /**
   * Get SCORM 2004 API wrapper
   */
  getSCORM2004API() {
    return `// SCORM 2004 API Wrapper - Simplified version
var API_1484_11 = null;
function findAPI(win) {
    var findAttempts = 0;
    while ((win.API_1484_11 == null) && (win.parent != null) && (win.parent != win)) {
        findAttempts++;
        if (findAttempts > 7) return null;
        win = win.parent;
    }
    return win.API_1484_11;
}
function getAPI() {
    if (API_1484_11 == null) API_1484_11 = findAPI(window);
    return API_1484_11;
}
function doStart() {
    var api = getAPI();
    if (api != null) {
        api.Initialize("");
        api.SetValue("cmi.completion_status", "incomplete");
    }
}
function doUnload() {
    var api = getAPI();
    if (api != null) {
        api.SetValue("cmi.completion_status", "completed");
        api.Terminate("");
    }
}`;
  }

  /**
   * Get SCORM styles
   */
  getSCORMStyles() {
    return `
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background: #f5f5f5;
}
.scorm-content {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
h1, h2, h3 { color: #333; }
p { line-height: 1.6; }
`;
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default ExportManager;
