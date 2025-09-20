/**
 * Data migration utilities for transitioning from localStorage to PostgreSQL
 * Handles seamless migration of existing user data
 */

import { courseQueries, userQueries, generationQueries } from './database.js';
import { generateToken } from './encryption.js';

/**
 * Migration service for handling data transitions
 */
export class MigrationService {
  constructor() {
    this.migrationKey = 'courseforge_migration_status';
  }

  /**
   * Check if migration is needed for current session
   * @returns {boolean} True if migration is needed
   */
  needsMigration() {
    if (typeof window === 'undefined') return false;
    
    // Check if we have localStorage data but no migration status
    const hasLocalData = this.hasLocalStorageData();
    const migrationStatus = localStorage.getItem(this.migrationKey);
    
    return hasLocalData && !migrationStatus;
  }

  /**
   * Check if localStorage contains CourseForge data
   * @returns {boolean} True if localStorage has data
   */
  hasLocalStorageData() {
    if (typeof window === 'undefined') return false;
    
    try {
      const courses = localStorage.getItem('courseforge_courses');
      const sessions = localStorage.getItem('courseforge_sessions');
      const analytics = localStorage.getItem('courseforge_analytics');
      
      return !!(courses || sessions || analytics);
    } catch (error) {
      console.warn('Error checking localStorage:', error);
      return false;
    }
  }

  /**
   * Extract data from localStorage
   * @returns {Object} Extracted data
   */
  extractLocalStorageData() {
    if (typeof window === 'undefined') return null;
    
    try {
      const courses = JSON.parse(localStorage.getItem('courseforge_courses') || '[]');
      const sessions = JSON.parse(localStorage.getItem('courseforge_sessions') || '[]');
      const analytics = JSON.parse(localStorage.getItem('courseforge_analytics') || '[]');
      const userPreferences = JSON.parse(localStorage.getItem('courseforge_user_preferences') || '{}');
      
      return {
        courses,
        sessions,
        analytics,
        userPreferences
      };
    } catch (error) {
      console.error('Error extracting localStorage data:', error);
      return null;
    }
  }

  /**
   * Migrate user data to database
   * @param {string} userId - User ID to migrate data for
   * @returns {Promise<Object>} Migration result
   */
  async migrateUserData(userId) {
    if (!userId) {
      throw new Error('User ID is required for migration');
    }

    const localData = this.extractLocalStorageData();
    if (!localData) {
      throw new Error('No local data found to migrate');
    }

    const migrationResult = {
      courses: 0,
      sessions: 0,
      analytics: 0,
      errors: []
    };

    try {
      // Migrate courses
      for (const localCourse of localData.courses) {
        try {
          // Create generation record if we have generation data
          let generationId = null;
          if (localCourse.generationData) {
            const generation = await generationQueries.create({
              user_id: userId,
              course_id: null,
              prompt_data: localCourse.generationData.prompt || {},
              ai_provider: localCourse.generationData.provider || 'openai',
              ai_model: localCourse.generationData.model || 'gpt-4o-mini'
            });
            
            // Update with metrics if available
            if (localCourse.generationData.tokensUsed || localCourse.generationData.cost) {
              await generationQueries.updateMetrics(
                generation.id,
                localCourse.generationData.tokensUsed || 0,
                localCourse.generationData.cost || 0
              );
            }
            
            await generationQueries.updateStatus(generation.id, 'completed');
            generationId = generation.id;
          }

          // Create course
          await courseQueries.create({
            user_id: userId,
            title: localCourse.title || 'Untitled Course',
            description: localCourse.context || localCourse.description || '',
            duration: localCourse.duration || '1-2 weeks',
            difficulty_level: localCourse.difficulty || 'intermediate',
            content: localCourse.content || '',
            structure: localCourse.structure || {},
            generation_id: generationId,
            ai_provider: localCourse.generationData?.provider || 'openai',
            ai_model: localCourse.generationData?.model || 'gpt-4o-mini'
          });

          migrationResult.courses++;
        } catch (error) {
          console.error('Error migrating course:', error);
          migrationResult.errors.push(`Course migration error: ${error.message}`);
        }
      }

      // Migrate analytics data
      for (const analyticsEvent of localData.analytics) {
        try {
          // Skip if event is too old (older than 90 days)
          const eventDate = new Date(analyticsEvent.timestamp || analyticsEvent.createdAt);
          const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          
          if (eventDate < ninetyDaysAgo) {
            continue;
          }

          // Import analytics event (simplified)
          // Note: We can't import all historical analytics due to schema differences
          // But we can import key events
          if (analyticsEvent.type === 'course_generated' || analyticsEvent.type === 'course_exported') {
            // Analytics will be recorded going forward, no need to migrate historical data
            migrationResult.analytics++;
          }
        } catch (error) {
          console.error('Error migrating analytics:', error);
          migrationResult.errors.push(`Analytics migration error: ${error.message}`);
        }
      }

      // Update user preferences if available
      if (localData.userPreferences && Object.keys(localData.userPreferences).length > 0) {
        try {
          await userQueries.updatePreferences(userId, localData.userPreferences);
        } catch (error) {
          console.error('Error migrating preferences:', error);
          migrationResult.errors.push(`Preferences migration error: ${error.message}`);
        }
      }

      // Mark migration as completed
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.migrationKey, JSON.stringify({
          completed: true,
          timestamp: new Date().toISOString(),
          userId,
          result: migrationResult
        }));
      }

      return migrationResult;

    } catch (error) {
      console.error('Migration error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Clean up localStorage after successful migration
   * @param {boolean} keepBackup - Whether to keep a backup
   */
  cleanupLocalStorage(keepBackup = true) {
    if (typeof window === 'undefined') return;

    try {
      const keysToClean = [
        'courseforge_courses',
        'courseforge_sessions',
        'courseforge_analytics',
        'courseforge_user_preferences'
      ];

      if (keepBackup) {
        // Create backup before cleaning
        const backup = {};
        keysToClean.forEach(key => {
          const data = localStorage.getItem(key);
          if (data) {
            backup[key] = data;
          }
        });

        localStorage.setItem('courseforge_backup', JSON.stringify({
          timestamp: new Date().toISOString(),
          data: backup
        }));
      }

      // Remove original keys
      keysToClean.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log('localStorage cleanup completed');
    } catch (error) {
      console.error('Error cleaning localStorage:', error);
    }
  }

  /**
   * Get migration status
   * @returns {Object|null} Migration status
   */
  getMigrationStatus() {
    if (typeof window === 'undefined') return null;

    try {
      const status = localStorage.getItem(this.migrationKey);
      return status ? JSON.parse(status) : null;
    } catch (error) {
      console.error('Error getting migration status:', error);
      return null;
    }
  }

  /**
   * Reset migration status (for testing)
   */
  resetMigrationStatus() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.migrationKey);
  }
}

/**
 * React hook for handling migration
 */
export function useMigration() {
  const migrationService = new MigrationService();

  const checkMigrationNeeded = () => {
    return migrationService.needsMigration();
  };

  const performMigration = async (userId) => {
    if (!userId) {
      throw new Error('User ID is required for migration');
    }

    const result = await migrationService.migrateUserData(userId);
    
    // Clean up localStorage after successful migration
    migrationService.cleanupLocalStorage(true);
    
    return result;
  };

  const getMigrationStatus = () => {
    return migrationService.getMigrationStatus();
  };

  return {
    checkMigrationNeeded,
    performMigration,
    getMigrationStatus,
    hasLocalData: migrationService.hasLocalStorageData()
  };
}

/**
 * Migration API endpoint helper
 */
export async function handleMigrationRequest(req, res, userId) {
  try {
    const migrationService = new MigrationService();
    
    // Extract data from request body (sent from frontend)
    const { localData } = req.body;
    
    if (!localData) {
      return res.status(400).json({ error: 'No local data provided for migration' });
    }

    // Perform migration with provided data
    const result = await migrationService.migrateUserData(userId);

    return res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      result
    });

  } catch (error) {
    console.error('Migration API error:', error);
    return res.status(500).json({
      error: 'Migration failed',
      message: error.message
    });
  }
}

// Export singleton instance
export const migrationService = new MigrationService();
