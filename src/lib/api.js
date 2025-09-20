/**
 * API client for CourseForge frontend
 * Handles authentication, course management, and data migration
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * API client class
 */
export class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = this.getStoredToken();
  }

  /**
   * Get stored authentication token
   */
  getStoredToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  /**
   * Store authentication token
   */
  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Remove authentication token
   */
  removeToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authentication header if token exists
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Handle authentication errors
      if (response.status === 401) {
        this.removeToken();
        throw new Error('Authentication required');
      }

      // Parse JSON response
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Authentication methods
   */
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      // Token is set via cookie, but we can also store it locally
      this.setToken(response.session?.token || 'authenticated');
    }

    return response;
  }

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success) {
      this.setToken(response.session?.token || 'authenticated');
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.removeToken();
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  /**
   * Course management methods
   */
  async getCourses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/courses${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async getCourse(id) {
    return this.request(`/courses/${id}`);
  }

  async createCourse(courseData) {
    return this.request('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  }

  async updateCourse(id, updates) {
    return this.request(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCourse(id) {
    return this.request(`/courses/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Course generation with streaming support
   */
  async generateCourse(courseData, onProgress = null) {
    const url = `${this.baseURL}/courses/generate`;
    
    const config = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: JSON.stringify({
        ...courseData,
        stream: !!onProgress, // Enable streaming if progress callback provided
      }),
    };

    if (onProgress) {
      // Handle streaming response
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onProgress(data);
                
                // Return final result when complete
                if (data.type === 'complete') {
                  return {
                    success: true,
                    course: data.course,
                    metrics: data.metrics,
                  };
                }
                
                // Throw error if generation failed
                if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // Handle non-streaming response
      return this.request('/courses/generate', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });
    }
  }

  /**
   * Data migration methods
   */
  async migrateData(localData) {
    return this.request('/users/migrate', {
      method: 'POST',
      body: JSON.stringify({ localData }),
    });
  }

  /**
   * Analytics methods
   */
  async getUsageAnalytics(days = 30) {
    return this.request(`/analytics/usage?days=${days}`);
  }
}

/**
 * React hooks for API integration
 */
export function useAuth() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const apiClient = new ApiClient();

  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCurrentUser();
      setUser(response.user);
      setError(null);
    } catch (err) {
      setUser(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await apiClient.login(email, password);
      setUser(response.user);
      setError(null);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await apiClient.register(userData);
      setUser(response.user);
      setError(null);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear user state even if logout request fails
      setUser(null);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    checkAuthStatus,
  };
}

export function useCourses() {
  const [courses, setCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const apiClient = new ApiClient();

  const fetchCourses = async (params = {}) => {
    try {
      setLoading(true);
      const response = await apiClient.getCourses(params);
      setCourses(response.courses);
      setError(null);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (courseData) => {
    try {
      const response = await apiClient.createCourse(courseData);
      setCourses(prev => [response.course, ...prev]);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateCourse = async (id, updates) => {
    try {
      const response = await apiClient.updateCourse(id, updates);
      setCourses(prev => 
        prev.map(course => 
          course.id === id ? response.course : course
        )
      );
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteCourse = async (id) => {
    try {
      await apiClient.deleteCourse(id);
      setCourses(prev => prev.filter(course => course.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    courses,
    loading,
    error,
    fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
  };
}

export function useCourseGeneration() {
  const [generating, setGenerating] = React.useState(false);
  const [progress, setProgress] = React.useState(null);
  const [error, setError] = React.useState(null);

  const apiClient = new ApiClient();

  const generateCourse = async (courseData) => {
    try {
      setGenerating(true);
      setError(null);
      setProgress({ type: 'status', message: 'Starting generation...', progress: 0 });

      const result = await apiClient.generateCourse(courseData, (progressData) => {
        setProgress(progressData);
      });

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  return {
    generating,
    progress,
    error,
    generateCourse,
  };
}

// Export singleton instance
export const apiClient = new ApiClient();
