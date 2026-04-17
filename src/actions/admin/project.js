"use server";

import { serializeFirestoreData } from "@/lib/utils";
import {
  validateCreateProject,
  validateUpdateProject,
} from "@/schemas/project";
import {
  logAdminAction,
  logPermissionChange,
  logResourceModification,
} from "@/utils/audit";
import {
  collections,
  queryDocumentsByIds,
  serializeFirestoreDoc,
} from "@/utils/database";
import { logger } from "@/utils/logger";
import {
  requireUser,
  verifyProjectAdmin,
  verifyProjectMembership,
  verifySuperAdmin,
} from "@/utils/server-auth";

/**
 * Creates a new project.
 * Requires Super Admin privileges.
 *
 * @param {Object} data - Project data
 * @param {string} data.name - Project name (required)
 * @param {string} [data.description] - Project description
 * @returns {Promise<{success: boolean, projectId?: string, error?: string}>}
 */
export async function createProject(data) {
  try {
    const { userUid } = await requireUser();

    // Only super admins can create projects
    await verifySuperAdmin({ userUid });

    // Validate input
    const validation = validateCreateProject(data);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const projectData = {
      name: validation.data.name,
      description: validation.data.description || "",
      admins: [],
      createdAt: new Date(),
      createdBy: userUid,
      updatedAt: new Date(),
      updatedBy: userUid,
    };

    // Create the project document
    const docRef = await collections.projects().add(projectData);

    // Log the action
    await logAdminAction({
      action: "create_project",
      actorUid: userUid,
      details: { projectId: docRef.id, name: projectData.name },
    });

    logger.info("Created new project", {
      actorUid: userUid,
      projectId: docRef.id,
      name: projectData.name,
    });

    return { success: true, projectId: docRef.id };
  } catch (error) {
    logger.error("Error creating project", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves project information.
 * Requires the user to be a member of the project or a super admin.
 *
 * @param {string} projectId - ID of the project to retrieve
 * @returns {Promise<{success: boolean, project?: Object, error?: string}>}
 */
export async function getProject(projectId) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this project
    await verifyProjectMembership({ userUid, projectId });

    const docRef = collections.projects().doc(projectId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.warn("Project not found", { projectId, userUid });
      return { success: false, error: "Project not found" };
    }

    return {
      success: true,
      project: serializeFirestoreData({ id: docSnap.id, ...docSnap.data() }),
    };
  } catch (error) {
    logger.error("Error fetching project", error, { projectId });
    return { success: false, error: error.message };
  }
}

/**
 * Updates project information.
 * Requires the user to be a Project Administrator or Super Admin.
 *
 * @param {string} projectId - ID of the project to update
 * @param {Object} data - Data to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateProject(projectId, data) {
  try {
    const { userUid } = await requireUser();

    // Verify user is admin of this project
    await verifyProjectAdmin({ userUid, projectId });

    // Validate input
    const validation = validateUpdateProject(data);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // Update Firestore
    await collections
      .projects()
      .doc(projectId)
      .update({
        ...validation.data,
        updatedAt: new Date(),
        updatedBy: userUid,
      });

    // Log the modification
    await logResourceModification({
      actorUid: userUid,
      resourceType: "project",
      resourceId: projectId,
      action: "update",
      details: { updatedFields: Object.keys(data) },
    });

    logger.info("Project updated", { projectId, userUid });

    return { success: true };
  } catch (error) {
    logger.error("Error updating project", error, { projectId });
    return { success: false, error: error.message };
  }
}

/**
 * Lists projects in the system.
 * Super admins see all projects.
 * Project admins and members see only their projects.
 *
 * @returns {Promise<{success: boolean, projects?: Array, error?: string}>}
 */
export async function listProjects() {
  try {
    const { userUid } = await requireUser();

    // Get user document to check role and projectIds
    const operatorDoc = await collections.operators().doc(userUid).get();

    if (!operatorDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const operatorData = operatorDoc.data();
    const isAdmin = operatorData.role === "admin";

    let projects = [];

    if (isAdmin) {
      // Super admins see all projects
      const snapshot = await collections.projects().get();
      projects = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...serializeFirestoreDoc(doc.data()),
      }));
    } else {
      // Non-admin users see only projects they are members of
      const userProjectIds = operatorData.projectIds || [];

      if (userProjectIds.length === 0) {
        return { success: true, projects: [] };
      }

      const docs = await queryDocumentsByIds(
        collections.projects(),
        userProjectIds,
      );
      projects.push(
        ...docs.map((doc) => ({
          id: doc.id,
          ...serializeFirestoreDoc(doc.data()),
        })),
      );
    }

    logger.info("Listed projects", {
      count: projects.length,
      actorUid: userUid,
      isAdmin,
    });

    return { success: true, projects };
  } catch (error) {
    logger.error("Error listing projects", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves users who are members of a specific project.
 * Requires Project Admin or Super Admin.
 *
 * @param {string} projectId - ID of the project
 * @returns {Promise<{success: boolean, users?: Array, error?: string}>}
 */
export async function getUsersByProject(projectId) {
  try {
    const { userUid } = await requireUser();

    // Verify the requester is allowed to view this project's users
    await verifyProjectAdmin({ userUid, projectId });

    // Get the project to check admins
    const projectRef = collections.projects().doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      logger.warn("Project not found", { projectId });
      return { success: false, error: "Project not found" };
    }

    const projectData = projectSnap.data();
    const projectAdmins = projectData.admins || [];

    // Query users (operators) who have this projectId in their list
    const operatorsQuery = collections
      .operators()
      .where("projectIds", "array-contains", projectId);
    const operatorsSnap = await operatorsQuery.get();

    const users = operatorsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email,
        displayName: data.displayName,
        role: data.role || "user",
        isProjectAdmin: projectAdmins.includes(doc.id),
        projectIds: data.projectIds || [],
        structureIds: data.structureIds || [],
      };
    });

    logger.info("Retrieved project users", {
      projectId,
      userCount: users.length,
    });

    return { success: true, users: serializeFirestoreData(users) };
  } catch (error) {
    logger.error("Error fetching project users", error, { projectId });
    return { success: false, error: error.message };
  }
}

/**
 * Adds a user to a project.
 * Requires Project Admin or Super Admin.
 *
 * @param {string} projectId - ID of the project
 * @param {string} targetUid - UID of user to add
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addUserToProject(projectId, targetUid) {
  try {
    const { userUid } = await requireUser();

    // Verify caller is project admin
    await verifyProjectAdmin({ userUid, projectId });

    // Get current operator document
    const operatorDoc = await collections.operators().doc(targetUid).get();

    if (!operatorDoc.exists) {
      return {
        success: false,
        error: "User not found in operators collection",
      };
    }

    const operatorData = operatorDoc.data();
    const currentProjects = operatorData.projectIds || [];

    // Check if already a member
    if (currentProjects.includes(projectId)) {
      return {
        success: false,
        error: "User is already a member of this project",
      };
    }

    // Verify project exists
    const projectDoc = await collections.projects().doc(projectId).get();
    if (!projectDoc.exists) {
      return { success: false, error: "Project not found" };
    }

    const newProjectIds = [...currentProjects, projectId];

    // Update Firestore
    await collections.operators().doc(targetUid).update({
      projectIds: newProjectIds,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    await logPermissionChange({
      actorUid: userUid,
      targetUid,
      changeType: "add_project",
      details: { projectId, newProjectIds },
    });

    logger.info("Added user to project", {
      actorUid: userUid,
      targetUid,
      projectId,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error adding user to project", error, {
      targetUid,
      projectId,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Removes a user from a project.
 * Also removes user from all structures belonging to this project.
 * Requires Project Admin or Super Admin.
 *
 * @param {string} projectId - ID of the project
 * @param {string} targetUid - UID of user to remove
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeUserFromProject(projectId, targetUid) {
  try {
    const { userUid } = await requireUser();

    // Verify caller is project admin
    await verifyProjectAdmin({ userUid, projectId });

    // Get current operator document
    const operatorDoc = await collections.operators().doc(targetUid).get();

    if (!operatorDoc.exists) {
      return {
        success: false,
        error: "User not found in operators collection",
      };
    }

    const operatorData = operatorDoc.data();
    const currentProjects = operatorData.projectIds || [];
    const currentStructures = operatorData.structureIds || [];

    // Check if is a member
    if (!currentProjects.includes(projectId)) {
      return { success: false, error: "User is not a member of this project" };
    }

    // Get all structures belonging to this project
    const projectStructures = await collections
      .structures()
      .where("projectId", "==", projectId)
      .get();

    const projectStructureIds = projectStructures.docs.map((doc) => doc.id);

    // Remove user from project and all its structures
    const newProjectIds = currentProjects.filter((id) => id !== projectId);
    const newStructureIds = currentStructures.filter(
      (id) => !projectStructureIds.includes(id),
    );

    // Update Firestore
    await collections.operators().doc(targetUid).update({
      projectIds: newProjectIds,
      structureIds: newStructureIds,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    await logPermissionChange({
      actorUid: userUid,
      targetUid,
      changeType: "remove_project",
      details: {
        projectId,
        newProjectIds,
        removedStructureIds: projectStructureIds,
      },
    });

    logger.info("Removed user from project", {
      actorUid: userUid,
      targetUid,
      projectId,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error removing user from project", error, {
      targetUid,
      projectId,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Toggles a user's admin status for a specific project.
 * Requires Project Admin or Super Admin.
 *
 * @param {string} projectId - ID of the project
 * @param {string} targetUid - UID of user to toggle admin status for
 * @param {boolean} shouldBeAdmin - Whether user should be an admin
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function toggleProjectAdminStatus(
  projectId,
  targetUid,
  shouldBeAdmin,
) {
  try {
    const { userUid } = await requireUser();

    // Verify the requester is allowed to modify project admins
    await verifyProjectAdmin({ userUid, projectId });

    const projectRef = collections.projects().doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      logger.warn("Project not found", { projectId });
      return { success: false, error: "Project not found" };
    }

    // Verify target user is a member of the project
    const operatorDoc = await collections.operators().doc(targetUid).get();
    if (!operatorDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const operatorData = operatorDoc.data();
    const userProjects = operatorData.projectIds || [];

    if (!userProjects.includes(projectId)) {
      return {
        success: false,
        error: "User must be a member of the project first",
      };
    }

    const projectData = projectSnap.data();
    const currentAdmins = projectData.admins || [];

    let newAdmins = [...currentAdmins];

    if (shouldBeAdmin) {
      if (!newAdmins.includes(targetUid)) {
        newAdmins.push(targetUid);
      }
    } else {
      newAdmins = newAdmins.filter((id) => id !== targetUid);
    }

    await projectRef.update({
      admins: newAdmins,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    // Log the permission change
    await logResourceModification({
      actorUid: userUid,
      resourceType: "project",
      resourceId: projectId,
      action: shouldBeAdmin ? "add_admin" : "remove_admin",
      details: { targetUid, newAdmins },
    });

    logger.info("Toggled project admin status", {
      projectId,
      targetUid,
      shouldBeAdmin,
      actorUid: userUid,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error toggling project admin", error, {
      projectId,
      targetUid,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Lists structures belonging to a specific project.
 * Requires Project membership or Super Admin.
 *
 * @param {string} projectId - ID of the project
 * @returns {Promise<{success: boolean, structures?: Array, error?: string}>}
 */
export async function getStructuresByProject(projectId) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this project
    await verifyProjectMembership({ userUid, projectId });

    // Query structures belonging to this project
    const snapshot = await collections
      .structures()
      .where("projectId", "==", projectId)
      .get();

    const structures = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...serializeFirestoreDoc(doc.data()),
    }));

    logger.info("Listed project structures", {
      projectId,
      count: structures.length,
    });

    return { success: true, structures };
  } catch (error) {
    logger.error("Error listing project structures", error, { projectId });
    return { success: false, error: error.message };
  }
}

/**
 * Creates a new structure within a project.
 * Requires Project Admin or Super Admin.
 *
 * @param {string} projectId - ID of the project
 * @param {Object} data - Structure data
 * @param {string} data.name - Structure name (required)
 * @param {string} [data.email] - Structure email
 * @param {string} [data.address] - Structure address
 * @param {string} [data.city] - Structure city
 * @param {string} [data.phone] - Structure phone
 * @param {string} [data.description] - Structure description
 * @returns {Promise<{success: boolean, structureId?: string, error?: string}>}
 */
export async function createStructureInProject(projectId, data) {
  try {
    const { userUid } = await requireUser();

    // Verify user is admin of this project
    await verifyProjectAdmin({ userUid, projectId });

    // Verify project exists
    const projectDoc = await collections.projects().doc(projectId).get();
    if (!projectDoc.exists) {
      return { success: false, error: "Project not found" };
    }

    // Validate required fields
    if (
      !data ||
      !data.name ||
      typeof data.name !== "string" ||
      !data.name.trim()
    ) {
      return { success: false, error: "Structure name is required" };
    }

    // Import default categories
    const { AccessTypes: DefaultAccessTypes } = await import(
      "@/components/Anagrafica/AccessDialog/AccessTypes"
    );

    const structureData = {
      name: data.name.trim(),
      email: data.email?.trim() || "",
      address: data.address?.trim() || "",
      city: data.city?.trim() || "",
      phone: data.phone?.trim() || "",
      description: data.description?.trim() || "",
      projectId: projectId,
      admins: [],
      accessCategories: JSON.parse(JSON.stringify(DefaultAccessTypes)),
      createdAt: new Date(),
      createdBy: userUid,
      updatedAt: new Date(),
      updatedBy: userUid,
    };

    // Create the structure document
    const docRef = await collections.structures().add(structureData);

    // Log the action
    await logAdminAction({
      action: "create_structure",
      actorUid: userUid,
      details: { structureId: docRef.id, name: structureData.name, projectId },
    });

    logger.info("Created new structure in project", {
      actorUid: userUid,
      structureId: docRef.id,
      name: structureData.name,
      projectId,
    });

    return { success: true, structureId: docRef.id };
  } catch (error) {
    logger.error("Error creating structure in project", error, { projectId });
    return { success: false, error: error.message };
  }
}

/**
 * Adds a user to a structure, verifying they are a project member first.
 * For use by Structure Admins who can only add project members to their structure.
 *
 * @param {string} structureId - ID of the structure
 * @param {string} targetUid - UID of user to add
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addProjectUserToStructure(structureId, targetUid) {
  try {
    const { userUid } = await requireUser();

    // Import verifyStructureAdmin
    const { verifyStructureAdmin } = await import("@/utils/server-auth");

    // Verify caller is structure admin
    await verifyStructureAdmin({ userUid, structureId });

    // Get structure to find its project
    const structureDoc = await collections.structures().doc(structureId).get();
    if (!structureDoc.exists) {
      return { success: false, error: "Structure not found" };
    }

    const structureData = structureDoc.data();
    const projectId = structureData.projectId;

    if (!projectId) {
      return {
        success: false,
        error: "Structure is not associated with a project",
      };
    }

    // Get target user's data
    const operatorDoc = await collections.operators().doc(targetUid).get();
    if (!operatorDoc.exists) {
      return { success: false, error: "User not found" };
    }

    const operatorData = operatorDoc.data();
    const userProjects = operatorData.projectIds || [];
    const userStructures = operatorData.structureIds || [];

    // Verify target user is a member of the project
    if (!userProjects.includes(projectId)) {
      return {
        success: false,
        error: "User must be a member of the project first",
      };
    }

    // Check if already has access to structure
    if (userStructures.includes(structureId)) {
      return {
        success: false,
        error: "User already has access to this structure",
      };
    }

    const newStructureIds = [...userStructures, structureId];

    // Update Firestore
    await collections.operators().doc(targetUid).update({
      structureIds: newStructureIds,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    await logPermissionChange({
      actorUid: userUid,
      targetUid,
      changeType: "add_structure",
      details: { structureId, projectId, newStructureIds },
    });

    logger.info("Added project user to structure", {
      actorUid: userUid,
      targetUid,
      structureId,
      projectId,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error adding project user to structure", error, {
      structureId,
      targetUid,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Adds an existing structure to a project.
 * Requires the user to be admin of BOTH the structure AND the project.
 *
 * @param {string} projectId - ID of the project to add the structure to
 * @param {string} structureId - ID of the structure to add
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addExistingStructureToProject(projectId, structureId) {
  try {
    const { userUid } = await requireUser();

    // Get the structure to verify it exists and check admin status
    const structureDoc = await collections.structures().doc(structureId).get();
    if (!structureDoc.exists) {
      return { success: false, error: "Structure not found" };
    }

    const structureData = structureDoc.data();
    const structureAdmins = structureData.admins || [];

    // Get the project to verify it exists and check admin status
    const projectDoc = await collections.projects().doc(projectId).get();
    if (!projectDoc.exists) {
      return { success: false, error: "Project not found" };
    }

    const projectData = projectDoc.data();
    const projectAdmins = projectData.admins || [];

    // Get user data to check if super admin
    const operatorDoc = await collections.operators().doc(userUid).get();
    const operatorData = operatorDoc.exists ? operatorDoc.data() : {};
    const isSuperAdmin = operatorData.role === "admin";

    // User must be admin of BOTH structure and project, OR be super admin
    const isStructureAdmin = structureAdmins.includes(userUid);
    const isProjectAdmin = projectAdmins.includes(userUid);

    if (!isSuperAdmin && (!isStructureAdmin || !isProjectAdmin)) {
      return {
        success: false,
        error:
          "You must be an admin of both the structure and the project to perform this action",
      };
    }

    // Check if structure already belongs to a project
    if (structureData.projectId) {
      if (structureData.projectId === projectId) {
        return {
          success: false,
          error: "Structure is already in this project",
        };
      }
      return {
        success: false,
        error:
          "Structure already belongs to another project. Remove it from that project first.",
      };
    }

    // Update the structure's projectId
    await collections.structures().doc(structureId).update({
      projectId: projectId,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    // Log the action
    await logResourceModification({
      actorUid: userUid,
      resourceType: "structure",
      resourceId: structureId,
      action: "add_to_project",
      details: { projectId, structureName: structureData.name },
    });

    logger.info("Added existing structure to project", {
      actorUid: userUid,
      structureId,
      projectId,
      structureName: structureData.name,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error adding existing structure to project", error, {
      projectId,
      structureId,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Gets structures that can be added to a project.
 * Returns structures where the user is an admin AND that don't already belong to a project.
 *
 * @param {string} projectId - ID of the project
 * @returns {Promise<{success: boolean, structures?: Array, error?: string}>}
 */
export async function getAvailableStructuresForProject(projectId) {
  try {
    const { userUid } = await requireUser();

    // Verify user is admin of this project
    await verifyProjectAdmin({ userUid, projectId });

    // Get user data to check if super admin
    const operatorDoc = await collections.operators().doc(userUid).get();
    const operatorData = operatorDoc.exists ? operatorDoc.data() : {};
    const isSuperAdmin = operatorData.role === "admin";

    // Get structures without a projectId
    const structuresQuery = await collections
      .structures()
      .where("projectId", "==", null)
      .get();

    // Also get structures where projectId field doesn't exist
    const allStructuresSnap = await collections.structures().get();

    const availableStructures = [];
    const seenIds = new Set();

    // Process structures without projectId
    for (const doc of structuresQuery.docs) {
      const data = doc.data();
      const structureAdmins = data.admins || [];

      // User must be admin of the structure OR be super admin
      if (isSuperAdmin || structureAdmins.includes(userUid)) {
        availableStructures.push({
          id: doc.id,
          name: data.name,
          description: data.description || "",
          city: data.city || "",
        });
        seenIds.add(doc.id);
      }
    }

    // Check for structures where projectId is undefined
    for (const doc of allStructuresSnap.docs) {
      if (seenIds.has(doc.id)) continue;

      const data = doc.data();
      if (data.projectId === undefined || data.projectId === "") {
        const structureAdmins = data.admins || [];

        if (isSuperAdmin || structureAdmins.includes(userUid)) {
          availableStructures.push({
            id: doc.id,
            name: data.name,
            description: data.description || "",
            city: data.city || "",
          });
        }
      }
    }

    logger.info("Retrieved available structures for project", {
      projectId,
      structureCount: availableStructures.length,
    });

    return {
      success: true,
      structures: serializeFirestoreData(availableStructures),
    };
  } catch (error) {
    logger.error("Error fetching available structures for project", error, {
      projectId,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Gets project users who are not yet members of a specific structure.
 * Useful for Structure Admins to see who they can add.
 *
 * @param {string} structureId - ID of the structure
 * @returns {Promise<{success: boolean, users?: Array, error?: string}>}
 */
export async function getAvailableProjectUsersForStructure(structureId) {
  try {
    const { userUid } = await requireUser();

    // Import verifyStructureAdmin
    const { verifyStructureAdmin } = await import("@/utils/server-auth");

    // Verify caller is structure admin
    await verifyStructureAdmin({ userUid, structureId });

    // Get structure to find its project
    const structureDoc = await collections.structures().doc(structureId).get();
    if (!structureDoc.exists) {
      return { success: false, error: "Structure not found" };
    }

    const structureData = structureDoc.data();
    const projectId = structureData.projectId;

    if (!projectId) {
      return {
        success: false,
        error: "Structure is not associated with a project",
      };
    }

    // Get all project members
    const projectMembersQuery = collections
      .operators()
      .where("projectIds", "array-contains", projectId);
    const projectMembersSnap = await projectMembersQuery.get();

    // Filter out users who already have access to this structure
    const availableUsers = projectMembersSnap.docs
      .filter((doc) => {
        const data = doc.data();
        const userStructures = data.structureIds || [];
        return !userStructures.includes(structureId);
      })
      .map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role || "user",
        };
      });

    logger.info("Retrieved available project users for structure", {
      structureId,
      projectId,
      userCount: availableUsers.length,
    });

    return { success: true, users: serializeFirestoreData(availableUsers) };
  } catch (error) {
    logger.error("Error fetching available project users", error, {
      structureId,
    });
    return { success: false, error: error.message };
  }
}
