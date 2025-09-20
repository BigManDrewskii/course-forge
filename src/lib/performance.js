/**
 * Performance Monitoring and Analytics
 * Tracks Core Web Vitals and user interactions
 */

/**
 * Performance Metrics Tracker
 */
export class PerformanceTracker {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = typeof window !== 'undefined' && 'performance' in window;
    
    if (this.isEnabled) {
      this.initializeTracking();
    }
  }

  /**
   * Initialize performance tracking
   */
  initializeTracking() {
    // Track Core Web Vitals
    this.trackCoreWebVitals();
    
    // Track custom metrics
    this.trackCustomMetrics();
    
    // Track user interactions
    this.trackUserInteractions();
    
    // Track API performance
    this.trackAPIPerformance();
  }

  /**
   * Track Core Web Vitals (CLS, FID, LCP)
   */
  trackCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime, {
        element: lastEntry.element?.tagName,
        url: lastEntry.url
      });
    });

    // First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entries) => {
      const firstEntry = entries[0];
      this.recordMetric('FID', firstEntry.processingStart - firstEntry.startTime, {
        eventType: firstEntry.name,
        target: firstEntry.target?.tagName
      });
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observePerformanceEntry('layout-shift', (entries) => {
      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue);
    });

    // Time to First Byte (TTFB)
    this.observeNavigationTiming((timing) => {
      const ttfb = timing.responseStart - timing.requestStart;
      this.recordMetric('TTFB', ttfb);
    });

    // First Contentful Paint (FCP)
    this.observePerformanceEntry('paint', (entries) => {
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.recordMetric('FCP', fcpEntry.startTime);
      }
    });
  }

  /**
   * Track custom application metrics
   */
  trackCustomMetrics() {
    // Course generation time
    this.trackCourseGeneration();
    
    // Export performance
    this.trackExportPerformance();
    
    // AI response times
    this.trackAIResponseTimes();
    
    // Bundle loading times
    this.trackBundleLoading();
  }

  /**
   * Track user interactions
   */
  trackUserInteractions() {
    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-track]');
      if (target) {
        this.recordInteraction('click', {
          element: target.dataset.track,
          timestamp: Date.now(),
          coordinates: { x: event.clientX, y: event.clientY }
        });
      }
    });

    // Form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (form.dataset.track) {
        this.recordInteraction('form_submit', {
          form: form.dataset.track,
          timestamp: Date.now()
        });
      }
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.recordInteraction('visibility_change', {
        hidden: document.hidden,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Track API performance
   */
  trackAPIPerformance() {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.recordMetric('API_REQUEST', endTime - startTime, {
          url: typeof url === 'string' ? url : url.url,
          status: response.status,
          method: args[1]?.method || 'GET',
          success: response.ok
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        
        this.recordMetric('API_REQUEST', endTime - startTime, {
          url: typeof url === 'string' ? url : url.url,
          method: args[1]?.method || 'GET',
          success: false,
          error: error.message
        });
        
        throw error;
      }
    };
  }

  /**
   * Track course generation performance
   */
  trackCourseGeneration() {
    window.addEventListener('courseGenerationStart', (event) => {
      this.startTimer('course_generation', {
        courseType: event.detail.courseType,
        difficulty: event.detail.difficulty
      });
    });

    window.addEventListener('courseGenerationComplete', (event) => {
      this.endTimer('course_generation', {
        success: event.detail.success,
        wordCount: event.detail.wordCount,
        sections: event.detail.sections
      });
    });
  }

  /**
   * Track export performance
   */
  trackExportPerformance() {
    window.addEventListener('exportStart', (event) => {
      this.startTimer('export', {
        format: event.detail.format,
        size: event.detail.size
      });
    });

    window.addEventListener('exportComplete', (event) => {
      this.endTimer('export', {
        success: event.detail.success,
        fileSize: event.detail.fileSize
      });
    });
  }

  /**
   * Track AI response times
   */
  trackAIResponseTimes() {
    window.addEventListener('aiRequestStart', (event) => {
      this.startTimer('ai_request', {
        provider: event.detail.provider,
        model: event.detail.model,
        type: event.detail.type
      });
    });

    window.addEventListener('aiRequestComplete', (event) => {
      this.endTimer('ai_request', {
        success: event.detail.success,
        tokens: event.detail.tokens,
        cost: event.detail.cost
      });
    });
  }

  /**
   * Track bundle loading performance
   */
  trackBundleLoading() {
    this.observePerformanceEntry('resource', (entries) => {
      entries.forEach(entry => {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
          this.recordMetric('BUNDLE_LOAD', entry.duration, {
            resource: entry.name,
            size: entry.transferSize,
            cached: entry.transferSize === 0
          });
        }
      });
    });
  }

  /**
   * Observe performance entries
   */
  observePerformanceEntry(type, callback) {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ type, buffered: true });
      this.observers.set(type, observer);
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  /**
   * Observe navigation timing
   */
  observeNavigationTiming(callback) {
    if (document.readyState === 'complete') {
      callback(performance.getEntriesByType('navigation')[0]);
    } else {
      window.addEventListener('load', () => {
        callback(performance.getEntriesByType('navigation')[0]);
      });
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...metadata
    };

    this.metrics.set(`${name}_${Date.now()}`, metric);
    
    // Send to analytics if configured
    this.sendToAnalytics(metric);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${name}:`, value, metadata);
    }
  }

  /**
   * Record user interaction
   */
  recordInteraction(type, data) {
    const interaction = {
      type,
      timestamp: Date.now(),
      url: window.location.href,
      ...data
    };

    this.sendToAnalytics(interaction, 'interaction');
  }

  /**
   * Start a timer
   */
  startTimer(name, metadata = {}) {
    this.metrics.set(`timer_${name}`, {
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End a timer
   */
  endTimer(name, metadata = {}) {
    const timer = this.metrics.get(`timer_${name}`);
    if (timer) {
      const duration = performance.now() - timer.startTime;
      this.recordMetric(name.toUpperCase(), duration, {
        ...timer.metadata,
        ...metadata
      });
      this.metrics.delete(`timer_${name}`);
    }
  }

  /**
   * Send metrics to analytics service
   */
  async sendToAnalytics(data, type = 'metric') {
    try {
      // Only send in production
      if (process.env.NODE_ENV !== 'production') return;

      // Batch metrics to reduce requests
      if (!this.analyticsBatch) {
        this.analyticsBatch = [];
        
        // Send batch after delay
        setTimeout(() => {
          this.flushAnalytics();
        }, 5000);
      }

      this.analyticsBatch.push({ type, data });

      // Send immediately for critical metrics
      if (data.name === 'LCP' || data.name === 'FID' || data.name === 'CLS') {
        this.flushAnalytics();
      }

    } catch (error) {
      console.warn('Analytics error:', error);
    }
  }

  /**
   * Flush analytics batch
   */
  async flushAnalytics() {
    if (!this.analyticsBatch || this.analyticsBatch.length === 0) return;

    try {
      await fetch('/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: this.analyticsBatch,
          session: this.getSessionId(),
          timestamp: Date.now()
        }),
      });

      this.analyticsBatch = [];
    } catch (error) {
      console.warn('Failed to send analytics:', error);
    }
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('cf_session_id');
    if (!sessionId) {
      sessionId = `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('cf_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      coreWebVitals: {},
      customMetrics: {},
      apiPerformance: {},
      userInteractions: 0
    };

    for (const [key, metric] of this.metrics) {
      if (metric.name === 'LCP' || metric.name === 'FID' || metric.name === 'CLS') {
        summary.coreWebVitals[metric.name] = metric.value;
      } else if (metric.name.startsWith('API_')) {
        if (!summary.apiPerformance[metric.name]) {
          summary.apiPerformance[metric.name] = [];
        }
        summary.apiPerformance[metric.name].push(metric.value);
      } else {
        summary.customMetrics[metric.name] = metric.value;
      }
    }

    return summary;
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    this.metrics.clear();
  }
}

/**
 * Global performance tracker instance
 */
export const performanceTracker = new PerformanceTracker();

/**
 * Performance utilities
 */
export const performance_utils = {
  /**
   * Mark the start of an operation
   */
  mark(name) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}_start`);
    }
  },

  /**
   * Measure the duration of an operation
   */
  measure(name) {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, `${name}_start`);
        const measure = performance.getEntriesByName(name)[0];
        performanceTracker.recordMetric(name.toUpperCase(), measure.duration);
        return measure.duration;
      } catch (error) {
        console.warn(`Failed to measure ${name}:`, error);
      }
    }
    return 0;
  },

  /**
   * Track component render time
   */
  trackRender(componentName, renderFn) {
    this.mark(`render_${componentName}`);
    const result = renderFn();
    this.measure(`render_${componentName}`);
    return result;
  },

  /**
   * Track async operation
   */
  async trackAsync(operationName, asyncFn) {
    this.mark(operationName);
    try {
      const result = await asyncFn();
      this.measure(operationName);
      return result;
    } catch (error) {
      this.measure(operationName);
      throw error;
    }
  }
};

/**
 * React hook for performance tracking
 */
export function usePerformanceTracking(componentName) {
  React.useEffect(() => {
    performanceTracker.recordMetric('COMPONENT_MOUNT', 0, {
      component: componentName
    });

    return () => {
      performanceTracker.recordMetric('COMPONENT_UNMOUNT', 0, {
        component: componentName
      });
    };
  }, [componentName]);

  return {
    trackEvent: (eventName, data) => {
      performanceTracker.recordInteraction(eventName, {
        component: componentName,
        ...data
      });
    },
    
    trackMetric: (metricName, value, metadata) => {
      performanceTracker.recordMetric(metricName, value, {
        component: componentName,
        ...metadata
      });
    }
  };
}

export default performanceTracker;
