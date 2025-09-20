/**
 * User data migration API endpoint
 * POST /api/users/migrate
 */

import { handleMigrationRequest } from '../../lib/migration.js';
import { withAuth, withErrorHandling, withCORS } from '../../lib/auth.js';

async function migrateHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user.id;
  
  return handleMigrationRequest(req, res, userId);
}

// Apply middleware
export default withErrorHandling(
  withCORS()(
    withAuth(
      migrateHandler
    )
  )
);
