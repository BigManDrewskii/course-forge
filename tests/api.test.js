/**
 * Comprehensive test suite for CourseForge API
 * Tests authentication, course management, and data migration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../src/lib/api.js';
import { authService } from '../src/lib/auth.js';
import { courseQueries, userQueries } from '../src/lib/database.js';

// Mock environment for testing
const TEST_API_URL = 'http://localhost:3000/api';

describe('API Client', () => {
  let apiClient;
  let testUser;
  let authToken;

  beforeEach(async () => {
    apiClient = new ApiClient();
    
    // Create test user
    testUser = await userQueries.create({
      email: 'test@example.com',
      name: 'Test User',
      preferences: {}
    });

    // Create test session
    const session = await authService.createSession(
      testUser,
      'test-user-agent',
      '127.0.0.1'
    );
    
    authToken = session.token;
    apiClient.setToken(authToken);
  });

  afterEach(async () => {
    // Cleanup test data
    if (testUser) {
      await userQueries.delete(testUser.id);
    }
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const response = await apiClient.login('test@example.com', 'password');
      
      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe('test@example.com');
    });

    it('should fail login with invalid credentials', async () => {
      await expect(
        apiClient.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should register new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123'
      };

      const response = await apiClient.register(userData);
      
      expect(response.success).toBe(true);
      expect(response.user.email).toBe(userData.email);
      expect(response.user.name).toBe(userData.name);
    });

    it('should get current user info', async () => {
      const response = await apiClient.getCurrentUser();
      
      expect(response.success).toBe(true);
      expect(response.user.id).toBe(testUser.id);
    });

    it('should logout successfully', async () => {
      await expect(apiClient.logout()).resolves.not.toThrow();
      expect(apiClient.token).toBeNull();
    });
  });

  describe('Course Management', () => {
    let testCourse;

    beforeEach(async () => {
      // Create test course
      testCourse = await courseQueries.create({
        user_id: testUser.id,
        title: 'Test Course',
        description: 'A test course',
        duration: '2-4 weeks',
        difficulty_level: 'intermediate',
        content: '# Test Course Content',
        structure: { modules: [] }
      });
    });

    it('should get user courses', async () => {
      const response = await apiClient.getCourses();
      
      expect(response.success).toBe(true);
      expect(response.courses).toBeInstanceOf(Array);
      expect(response.courses.length).toBeGreaterThan(0);
      expect(response.courses[0].title).toBe('Test Course');
    });

    it('should get specific course', async () => {
      const response = await apiClient.getCourse(testCourse.id);
      
      expect(response.success).toBe(true);
      expect(response.course.id).toBe(testCourse.id);
      expect(response.course.title).toBe('Test Course');
    });

    it('should create new course', async () => {
      const courseData = {
        title: 'New Course',
        description: 'A new course',
        duration: '1-2 weeks',
        difficulty_level: 'beginner',
        content: '# New Course Content'
      };

      const response = await apiClient.createCourse(courseData);
      
      expect(response.success).toBe(true);
      expect(response.course.title).toBe(courseData.title);
      expect(response.course.user_id).toBe(testUser.id);
    });

    it('should update course', async () => {
      const updates = {
        title: 'Updated Course Title',
        content: '# Updated Content'
      };

      const response = await apiClient.updateCourse(testCourse.id, updates);
      
      expect(response.success).toBe(true);
      expect(response.course.title).toBe(updates.title);
    });

    it('should delete course', async () => {
      await expect(
        apiClient.deleteCourse(testCourse.id)
      ).resolves.not.toThrow();

      // Verify course is deleted
      await expect(
        apiClient.getCourse(testCourse.id)
      ).rejects.toThrow('Course not found');
    });
  });

  describe('Course Generation', () => {
    it('should generate course without streaming', async () => {
      const courseData = {
        title: 'AI Course Generation',
        context: 'Learn how to build AI applications',
        duration: '2-4 weeks',
        difficulty_level: 'intermediate'
      };

      const response = await apiClient.generateCourse(courseData);
      
      expect(response.success).toBe(true);
      expect(response.course).toBeDefined();
      expect(response.course.title).toBe(courseData.title);
      expect(response.metrics).toBeDefined();
      expect(response.metrics.tokens_used).toBeGreaterThan(0);
    });

    it('should generate course with streaming', async () => {
      const courseData = {
        title: 'Streaming AI Course',
        context: 'Learn streaming AI generation',
        duration: '1-2 weeks',
        difficulty_level: 'beginner'
      };

      const progressUpdates = [];
      
      const response = await apiClient.generateCourse(courseData, (progress) => {
        progressUpdates.push(progress);
      });

      expect(response.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].type).toBe('status');
      expect(progressUpdates[progressUpdates.length - 1].type).toBe('complete');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      apiClient.removeToken();
      
      await expect(
        apiClient.getCourses()
      ).rejects.toThrow('Authentication required');
    });

    it('should handle not found errors', async () => {
      await expect(
        apiClient.getCourse('non-existent-id')
      ).rejects.toThrow('Course not found');
    });

    it('should handle validation errors', async () => {
      await expect(
        apiClient.createCourse({})
      ).rejects.toThrow('Title and content are required');
    });
  });
});

describe('Database Integration', () => {
  describe('User Queries', () => {
    let testUser;

    afterEach(async () => {
      if (testUser) {
        await userQueries.delete(testUser.id);
      }
    });

    it('should create user', async () => {
      testUser = await userQueries.create({
        email: 'dbtest@example.com',
        name: 'DB Test User',
        preferences: { theme: 'dark' }
      });

      expect(testUser.id).toBeDefined();
      expect(testUser.email).toBe('dbtest@example.com');
      expect(testUser.preferences.theme).toBe('dark');
    });

    it('should find user by email', async () => {
      testUser = await userQueries.create({
        email: 'findtest@example.com',
        name: 'Find Test User'
      });

      const foundUser = await userQueries.findByEmail('findtest@example.com');
      
      expect(foundUser.id).toBe(testUser.id);
      expect(foundUser.name).toBe('Find Test User');
    });

    it('should update user preferences', async () => {
      testUser = await userQueries.create({
        email: 'updatetest@example.com',
        name: 'Update Test User'
      });

      const updatedUser = await userQueries.updatePreferences(testUser.id, {
        theme: 'light',
        notifications: true
      });

      expect(updatedUser.preferences.theme).toBe('light');
      expect(updatedUser.preferences.notifications).toBe(true);
    });
  });

  describe('Course Queries', () => {
    let testUser;
    let testCourse;

    beforeEach(async () => {
      testUser = await userQueries.create({
        email: 'coursetest@example.com',
        name: 'Course Test User'
      });
    });

    afterEach(async () => {
      if (testCourse) {
        await courseQueries.delete(testCourse.id, testUser.id);
      }
      if (testUser) {
        await userQueries.delete(testUser.id);
      }
    });

    it('should create course', async () => {
      testCourse = await courseQueries.create({
        user_id: testUser.id,
        title: 'Database Test Course',
        description: 'Testing database operations',
        duration: '1-2 weeks',
        difficulty_level: 'beginner',
        content: '# Test Content',
        structure: { modules: ['Module 1'] }
      });

      expect(testCourse.id).toBeDefined();
      expect(testCourse.title).toBe('Database Test Course');
      expect(testCourse.user_id).toBe(testUser.id);
    });

    it('should find courses by user', async () => {
      testCourse = await courseQueries.create({
        user_id: testUser.id,
        title: 'Find Test Course',
        content: '# Content'
      });

      const courses = await courseQueries.findByUserId(testUser.id);
      
      expect(courses.length).toBeGreaterThan(0);
      expect(courses[0].title).toBe('Find Test Course');
    });

    it('should update course content', async () => {
      testCourse = await courseQueries.create({
        user_id: testUser.id,
        title: 'Update Test Course',
        content: '# Original Content'
      });

      const updatedCourse = await courseQueries.updateContent(
        testCourse.id,
        '# Updated Content',
        testUser.id
      );

      expect(updatedCourse.content).toBe('# Updated Content');
    });
  });
});

describe('Authentication Service', () => {
  let testUser;

  afterEach(async () => {
    if (testUser) {
      await userQueries.delete(testUser.id);
    }
  });

  it('should register new user', async () => {
    const userData = {
      email: 'authtest@example.com',
      name: 'Auth Test User',
      password: 'testpassword123'
    };

    const result = await authService.register(userData);
    testUser = result.user;

    expect(result.user.email).toBe(userData.email);
    expect(result.session.token).toBeDefined();
  });

  it('should login existing user', async () => {
    // First register a user
    testUser = await userQueries.create({
      email: 'logintest@example.com',
      name: 'Login Test User',
      preferences: {
        hashedPassword: await hashPassword('testpassword')
      }
    });

    const result = await authService.login({
      email: 'logintest@example.com',
      password: 'testpassword'
    });

    expect(result.user.id).toBe(testUser.id);
    expect(result.session.token).toBeDefined();
  });

  it('should validate session', async () => {
    testUser = await userQueries.create({
      email: 'sessiontest@example.com',
      name: 'Session Test User'
    });

    const session = await authService.createSession(testUser, 'test-agent', '127.0.0.1');
    const validation = await authService.validateSession(session.token);

    expect(validation.user.id).toBe(testUser.id);
  });
});
