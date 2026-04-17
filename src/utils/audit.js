/**
 * Audit logging utilities for tracking security-sensitive operations
 * Creates an audit trail for compliance and security incident investigation
 */

import { collections } from "./database";
import { logger } from "./logger";

/**
 * Logs an administrative action to the audit trail
 *
 * @param {Object} params - Audit log parameters
 * @param {string} params.action - Action performed (e.g., 'set_user_claims', 'delete_anagrafica')
 * @param {string} params.actorUid - UID of the user performing the action
 * @param {string} [params.targetUid] - UID of the user being acted upon (if applicable)
 * @param {string} [params.resourceId] - ID of the resource being modified (if applicable)
 * @param {string} [params.resourceType] - Type of resource (e.g., 'anagrafica', 'structure')
 * @param {Object} [params.details] - Additional details about the action
 * @param {boolean} [params.success=true] - Whether the action succeeded
 * @returns {Promise<void>}
 */
export async function logAdminAction({
  action,
  actorUid,
  targetUid = null,
  resourceId = null,
  resourceType = null,
  details = {},
  success = true,
}) {
  try {
    const auditLog = {
      action,
      actorUid,
      targetUid,
      resourceId,
      resourceType,
      details,
      success,
      timestamp: new Date(),
      // Additional metadata that might be useful
      environment: process.env.NODE_ENV || "unknown",
    };

    await collections.auditLogs().add(auditLog);

    logger.info("Audit log created", {
      action,
      actorUid,
      targetUid,
      resourceId,
      success,
    });
  } catch (error) {
    // Don't let audit logging failures break the operation
    // but do log the error
    logger.error("Failed to create audit log", error, {
      action,
      actorUid,
      targetUid,
      resourceId,
    });
  }
}

/**
 * Helper to log user permission changes
 */
export async function logPermissionChange({
  actorUid,
  targetUid,
  changeType,
  details,
}) {
  return logAdminAction({
    action: `permission_${changeType}`,
    actorUid,
    targetUid,
    resourceType: "user_permissions",
    details,
  });
}

/**
 * Helper to log resource modifications
 */
export async function logResourceModification({
  actorUid,
  resourceType,
  resourceId,
  action,
  details,
}) {
  return logAdminAction({
    action: `${resourceType}_${action}`,
    actorUid,
    resourceType,
    resourceId,
    details,
  });
}

/**
 * Logs a data access event (read operation)
 * Used for tracking who accessed sensitive personal data
 *
 * @param {Object} params - Log parameters
 * @param {string} params.actorUid - UID of the user accessing the data
 * @param {string} params.resourceType - Type of resource ('anagrafica', 'accessi')
 * @param {string} params.resourceId - ID of the resource being accessed
 * @param {string} [params.structureId] - Structure through which access was made
 * @param {Object} [params.details] - Additional context
 * @returns {Promise<void>}
 */
export async function logDataAccess({
  actorUid,
  resourceType,
  resourceId,
  structureId = null,
  details = {},
}) {
  return logAdminAction({
    action: `${resourceType}_read`,
    actorUid,
    resourceType,
    resourceId,
    details: {
      ...details,
      structureId,
      accessType: "read",
    },
  });
}

/**
 * Logs a data creation event
 *
 * @param {Object} params - Log parameters
 * @param {string} params.actorUid - UID of the user creating the data
 * @param {string} params.resourceType - Type of resource ('anagrafica', 'accessi')
 * @param {string} params.resourceId - ID of the created resource
 * @param {string} [params.structureId] - Structure through which creation was made
 * @param {Object} [params.details] - Additional context
 * @returns {Promise<void>}
 */
export async function logDataCreate({
  actorUid,
  resourceType,
  resourceId,
  structureId = null,
  details = {},
}) {
  return logAdminAction({
    action: `${resourceType}_create`,
    actorUid,
    resourceType,
    resourceId,
    details: {
      ...details,
      structureId,
      accessType: "create",
    },
  });
}

/**
 * Logs a data update event
 *
 * @param {Object} params - Log parameters
 * @param {string} params.actorUid - UID of the user updating the data
 * @param {string} params.resourceType - Type of resource ('anagrafica', 'accessi')
 * @param {string} params.resourceId - ID of the updated resource
 * @param {string} [params.structureId] - Structure through which update was made
 * @param {string[]} [params.changedFields] - List of fields that were changed
 * @param {Object} [params.details] - Additional context
 * @returns {Promise<void>}
 */
export async function logDataUpdate({
  actorUid,
  resourceType,
  resourceId,
  structureId = null,
  changedFields = [],
  details = {},
}) {
  return logAdminAction({
    action: `${resourceType}_update`,
    actorUid,
    resourceType,
    resourceId,
    details: {
      ...details,
      structureId,
      changedFields,
      accessType: "update",
    },
  });
}

/**
 * Logs a data deletion event
 *
 * @param {Object} params - Log parameters
 * @param {string} params.actorUid - UID of the user deleting the data
 * @param {string} params.resourceType - Type of resource ('anagrafica', 'accessi')
 * @param {string} params.resourceId - ID of the deleted resource
 * @param {string} [params.structureId] - Structure through which deletion was made
 * @param {boolean} [params.softDelete=true] - Whether this is a soft delete
 * @param {Object} [params.details] - Additional context
 * @returns {Promise<void>}
 */
export async function logDataDelete({
  actorUid,
  resourceType,
  resourceId,
  structureId = null,
  softDelete = true,
  details = {},
}) {
  return logAdminAction({
    action: `${resourceType}_delete`,
    actorUid,
    resourceType,
    resourceId,
    details: {
      ...details,
      structureId,
      softDelete,
      accessType: "delete",
    },
  });
}

/**
 * Logs a file access event
 *
 * @param {Object} params - Log parameters
 * @param {string} params.actorUid - UID of the user accessing the file
 * @param {string} params.resourceId - ID of the parent resource (anagraficaId)
 * @param {string} params.filePath - Path of the file being accessed
 * @param {string} [params.structureId] - Structure through which access was made
 * @param {Object} [params.details] - Additional context
 * @returns {Promise<void>}
 */
export async function logFileAccess({
  actorUid,
  resourceId,
  filePath,
  structureId = null,
  details = {},
}) {
  return logAdminAction({
    action: "file_access",
    actorUid,
    resourceType: "file",
    resourceId,
    details: {
      ...details,
      filePath,
      structureId,
      accessType: "read",
    },
  });
}
