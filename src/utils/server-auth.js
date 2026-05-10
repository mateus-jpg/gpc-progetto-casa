import { headers } from "next/headers";
import { arraysIntersect, getUserDocument } from "./database";
import { logger } from "./logger";

function normalizeIdArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value) return [value];
  return [];
}

/**
 * Extracts the user UID from headers.
 * Throws an error if not found.
 *
 * @returns {Promise<{userUid: string, headers: Headers}>}
 * @throws {Error} If x-user-uid header is missing
 */
export async function requireUser() {
  const hdr = await headers();
  const userUid = hdr.get("x-user-uid");
  if (!userUid) {
    throw new Error("Unauthorized: Missing x-user-uid header");
  }
  return { userUid, headers: hdr };
}

/**
 * Verifies that the user (operator) exists and has access to the given structure/anagrafica.
 *
 * @param {Object} params - Verification parameters
 * @param {string} params.userUid - User's UID
 * @param {string} [params.structureId] - Specific structure ID to check access for
 * @param {string[]} [params.allowedStructures] - Array of structure IDs that grant access
 * @returns {Promise<{operatorData: Object, userStructures: string[], isSuperAdmin: boolean}>}
 * @throws {Error} If user not found or lacks required permissions
 */
export async function verifyUserPermissions({
  userUid,
  structureId,
  projectId,
  allowedStructures = [],
}) {
  const userDoc = await getUserDocument(userUid);

  if (!userDoc.exists) {
    logger.warn("User not found during permission check", { userUid });
    throw new Error(`User ${userUid} not found in operators or users`);
  }

  const operatorData = userDoc.data;

  // Super Admin bypass: if user is a global admin, grant access to all structures/projects
  if (operatorData.role === "admin") {
    logger.debug("Super admin bypassing structure checks", { userUid });
    return {
      operatorData,
      userStructures: [],
      userProjects: [],
      isSuperAdmin: true,
    };
  }

  const userStructures = normalizeIdArray(
    operatorData.structureIds || operatorData.structureId,
  );
  const userProjects = normalizeIdArray(operatorData.projectIds);

  // 1. If projectId is provided, check if user has access to this specific project
  if (projectId && !userProjects.includes(projectId)) {
    logger.warn("User lacks access to project", {
      userUid,
      projectId,
      userProjects,
    });
    throw new Error(
      `Forbidden: User does not have access to project ${projectId}`,
    );
  }

  // 2. If structureId is provided, check if user has access to this specific structure
  if (structureId && !userStructures.includes(structureId)) {
    logger.warn("User lacks access to structure", {
      userUid,
      structureId,
      userStructures,
    });
    throw new Error(
      `Forbidden: User does not have access to structure ${structureId}`,
    );
  }

  // 3. If allowedStructures is provided (e.g. from an existing Anagrafica), check intersection
  if (allowedStructures.length > 0) {
    const hasAccess = arraysIntersect(allowedStructures, userStructures);
    if (!hasAccess) {
      logger.warn("User lacks access to resource", {
        userUid,
        allowedStructures,
        userStructures,
      });
      throw new Error(
        "Forbidden: User does not have permission to access this resource",
      );
    }
  }

  return {
    operatorData,
    userStructures,
    userProjects,
    isSuperAdmin: false,
  };
}

/**
 * Verifies if a user is an admin of a specific structure.
 * Super admins automatically pass this check.
 *
 * @param {Object} params - Verification parameters
 * @param {string} params.userUid - User's UID
 * @param {string} params.structureId - Structure ID to check admin status for
 * @returns {Promise<boolean>} True if user is admin
 * @throws {Error} If user is not an admin of the structure
 */
export async function verifyStructureAdmin({ userUid, structureId }) {
  const userDoc = await getUserDocument(userUid);

  if (!userDoc.exists) {
    logger.warn("User not found during structure admin check", { userUid });
    throw new Error("User not found");
  }

  const operatorData = userDoc.data;

  // Check if user is a global admin
  if (operatorData.role === "admin") {
    logger.debug("Super admin accessing structure admin function", {
      userUid,
      structureId,
    });
    return true;
  }

  // Check structure specific admin list
  const { collections } = await import("./database");
  const structureDoc = await collections.structures().doc(structureId).get();

  if (!structureDoc.exists) {
    logger.warn("Structure not found", { structureId });
    throw new Error("Structure not found");
  }

  const structureData = structureDoc.data();
  const admins = structureData.admins || [];

  if (admins.includes(userUid)) {
    return true;
  }

  logger.warn("User is not structure admin", { userUid, structureId });
  throw new Error("Forbidden: User is not an admin of this structure");
}

/**
 * Verifies if the user is a Super Admin.
 * Checks against the database for role: 'admin'.
 *
 * @param {Object} params - Verification parameters
 * @param {string} params.userUid - User's UID
 * @returns {Promise<boolean>} True if user is super admin
 * @throws {Error} If user is not a super admin
 */
export async function verifySuperAdmin({ userUid }) {
  const userDoc = await getUserDocument(userUid);

  if (!userDoc.exists) {
    logger.warn("User not found during super admin check", { userUid });
    throw new Error("Forbidden: User not found");
  }

  const data = userDoc.data;

  if (data.role === "admin") {
    logger.debug("Super admin verified", { userUid });
    return true;
  }

  logger.warn("User is not super admin", { userUid, role: data.role });
  throw new Error("Forbidden: User is not a Super Admin");
}

/**
 * Verifies if a user is an admin of a specific project.
 * Super admins automatically pass this check.
 *
 * @param {Object} params - Verification parameters
 * @param {string} params.userUid - User's UID
 * @param {string} params.projectId - Project ID to check admin status for
 * @returns {Promise<boolean>} True if user is admin
 * @throws {Error} If user is not an admin of the project
 */
export async function verifyProjectAdmin({ userUid, projectId }) {
  const userDoc = await getUserDocument(userUid);

  if (!userDoc.exists) {
    logger.warn("User not found during project admin check", { userUid });
    throw new Error("User not found");
  }

  const operatorData = userDoc.data;

  // Check if user is a global admin
  if (operatorData.role === "admin") {
    logger.debug("Super admin accessing project admin function", {
      userUid,
      projectId,
    });
    return true;
  }

  // Check project specific admin list
  const { collections } = await import("./database");
  const projectDoc = await collections.projects().doc(projectId).get();

  if (!projectDoc.exists) {
    logger.warn("Project not found", { projectId });
    throw new Error("Project not found");
  }

  const projectData = projectDoc.data();
  const admins = projectData.admins || [];

  if (admins.includes(userUid)) {
    return true;
  }

  logger.warn("User is not project admin", { userUid, projectId });
  throw new Error("Forbidden: User is not an admin of this project");
}

/**
 * Verifies if a user is a member of a specific project.
 * Super admins automatically pass this check.
 *
 * @param {Object} params - Verification parameters
 * @param {string} params.userUid - User's UID
 * @param {string} params.projectId - Project ID to check membership for
 * @returns {Promise<boolean>} True if user is a member
 * @throws {Error} If user is not a member of the project
 */
export async function verifyProjectMembership({ userUid, projectId }) {
  const userDoc = await getUserDocument(userUid);

  if (!userDoc.exists) {
    logger.warn("User not found during project membership check", { userUid });
    throw new Error("User not found");
  }

  const operatorData = userDoc.data;

  // Super Admin bypass
  if (operatorData.role === "admin") {
    logger.debug("Super admin bypassing project membership check", {
      userUid,
      projectId,
    });
    return true;
  }

  const userProjects = normalizeIdArray(operatorData.projectIds);

  if (userProjects.includes(projectId)) {
    return true;
  }

  logger.warn("User is not a member of project", { userUid, projectId });
  throw new Error("Forbidden: User is not a member of this project");
}
