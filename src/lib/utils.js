// Utility functions for CourseForge
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS class merging utility
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Currency formatting
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
  }).format(amount)
}

/**
 * Token count formatting
 */
export function formatTokenCount(tokens) {
  return new Intl.NumberFormat('en-US').format(tokens)
}

/**
 * Date formatting
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

/**
 * Generate unique ID
 */
export function generateId() {
  return crypto.randomUUID()
}

/**
 * Debounce function for performance optimization
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy text: ', err)
    return false
  }
}

/**
 * Download text as file
 */
export function downloadTextAsFile(text, filename, mimeType = 'text/plain') {
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Sanitize filename for download
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + '…'
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Focus management utilities
 */
export const focusUtils = {
  // Get all focusable elements within a container
  getFocusableElements(container) {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')
    
    return Array.from(container.querySelectorAll(focusableSelectors))
  },

  // Trap focus within a container (for modals)
  trapFocus(container) {
    const focusableElements = this.getFocusableElements(container)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    
    // Focus first element
    if (firstElement) {
      firstElement.focus()
    }

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }
}

/**
 * Accessibility utilities
 */
export const a11yUtils = {
  // Announce to screen readers
  announce(message, priority = 'polite') {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message
    
    document.body.appendChild(announcer)
    
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  },

  // Generate unique ID for form elements
  generateId(prefix = 'field') {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  }
}
