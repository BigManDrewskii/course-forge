/**
 * Test setup configuration
 */

import { beforeAll, afterAll, vi } from 'vitest'

// Mock environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/courseforge_test'
  process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-only'
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'
})

// Mock localStorage for browser APIs
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock fetch for API calls
global.fetch = vi.fn()

// Clean up after tests
afterAll(() => {
  vi.clearAllMocks()
})
