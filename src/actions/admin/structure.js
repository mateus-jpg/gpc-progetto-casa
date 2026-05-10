"use server";

import { AccessTypes as DefaultAccessTypes } from "@/components/Anagrafica/AccessDialog/AccessTypes";
import {
  DEFAULT_FORM_CONFIGURATION,
  mergeWithDefaults,
  SECTION_DEFINITIONS,
} from "@/data/formConfigDefaults";
import { normalizeHouseSetupInput } from "@/lib/house-setup";
import { serializeFirestoreData } from "@/lib/utils";
import { logAdminAction, logResourceModification } from "@/utils/audit";
import { collections } from "@/utils/database";
import { logger } from "@/utils/logger";
import {
  requireUser,
  verifyStructureAdmin,
  verifySuperAdmin,
  verifyUserPermissions,
} from "@/utils/server-auth";

/**
 * Retrieves structure information.
 * Requires the user to have permission (either Structure Admin or Super Admin).
 *
 * @param {string} structureId - ID of the structure to retrieve
 * @returns {Promise<Object>} Structure data
 * @throws {Error} If user lacks permissions or structure not found
 */
export async function getStructure(structureId) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this structure
    await verifyUserPermissions({ userUid, structureId });

    const docRef = collections.structures().doc(structureId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.warn("Structure not found", { structureId, userUid });
      throw new Error("Structure not found");
    }

    return serializeFirestoreData({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    logger.error("Error fetching structure", error, { structureId });
    throw new Error("Failed to fetch structure");
  }
}

/**
 * Updates structure information.
 * Requires the user to be a Structure Administrator or Super Admin.
 *
 * @param {string} structureId - ID of the structure to update
 * @param {Object} data - Data to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateStructure(structureId, data) {
  try {
    const { userUid } = await requireUser();

    // Verify user can manage this structure
    await verifyStructureAdmin({ userUid, structureId });

    // Validate data (basic validation)
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data provided");
    }

    const allowedStringFields = [
      "name",
      "email",
      "address",
      "city",
      "phone",
      "description",
    ];

    const payload = {};

    for (const field of allowedStringFields) {
      if (Object.hasOwn(data, field)) {
        payload[field] =
          typeof data[field] === "string" ? data[field].trim() : data[field];
      }
    }

    if (Object.hasOwn(data, "houseSetup")) {
      payload.houseSetup = normalizeHouseSetupInput(data.houseSetup);
    }

    if (Object.hasOwn(payload, "name") && !payload.name) {
      throw new Error("Structure name is required");
    }

    const updatedFields = Object.keys(payload);
    if (updatedFields.length === 0) {
      throw new Error("No valid fields to update");
    }

    // Update Firestore
    await collections
      .structures()
      .doc(structureId)
      .update({
        ...payload,
        updatedAt: new Date(),
        updatedBy: userUid,
      });

    // Log the modification
    await logResourceModification({
      actorUid: userUid,
      resourceType: "structure",
      resourceId: structureId,
      action: "update",
      details: { updatedFields },
    });

    logger.info("Structure updated", { structureId, userUid });

    return { success: true };
  } catch (error) {
    logger.error("Error updating structure", error, { structureId });
    return { success: false, error: error.message };
  }
}

async function fetchStructureUsers(structureId) {
  const structureRef = collections.structures().doc(structureId);
  const structureSnap = await structureRef.get();

  if (!structureSnap.exists) {
    logger.warn("Structure not found", { structureId });
    throw new Error("Structure not found");
  }

  const structureData = structureSnap.data();
  const structureAdmins = structureData.admins || [];

  const usersQuery = collections
    .users()
    .where("structureIds", "array-contains", structureId);
  const operatorsQuery = collections
    .operators()
    .where("structureIds", "array-contains", structureId);

  const [usersSnap, operatorsSnap] = await Promise.all([
    usersQuery.get(),
    operatorsQuery.get(),
  ]);

  const userMap = new Map();

  const processSnapshot = (snap) => {
    snap.forEach((doc) => {
      const data = doc.data();
      const displayName =
        data.displayName || data.email || data.name || `Operatore ${doc.id}`;

      userMap.set(doc.id, {
        uid: doc.id,
        email: data.email,
        displayName,
        role: data.role || "user",
        isStructureAdmin: structureAdmins.includes(doc.id),
        structureIds: data.structureIds || [],
      });
    });
  };

  processSnapshot(usersSnap);
  processSnapshot(operatorsSnap);

  return Array.from(userMap.values()).sort((left, right) =>
    (left.displayName || "").localeCompare(right.displayName || "", "it"),
  );
}

/**
 * Retrieves users who have access to a specific structure.
 * Returns their basic info and whether they are an admin of that structure.
 *
 * @param {string} structureId - ID of the structure
 * @returns {Promise<Array>} List of users with access to the structure
 * @throws {Error} If user lacks permissions or structure not found
 */
export async function getUsersByStructure(structureId) {
  try {
    const { userUid } = await requireUser();

    // Verify the requester is allowed to view this structure's users
    await verifyStructureAdmin({ userUid, structureId });
    const users = await fetchStructureUsers(structureId);
    logger.info("Retrieved structure users", {
      structureId,
      userCount: users.length,
    });

    return serializeFirestoreData(users);
  } catch (error) {
    logger.error("Error fetching structure users", error, { structureId });
    throw new Error("Failed to fetch users for structure.");
  }
}

export async function getStructureOperatorOptions(structureId) {
  try {
    const { userUid } = await requireUser();
    await verifyUserPermissions({ userUid, structureId });

    const users = await fetchStructureUsers(structureId);

    return serializeFirestoreData(
      users.map((user) => ({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email || "",
      })),
    );
  } catch (error) {
    logger.error("Error fetching structure operator options", error, {
      structureId,
    });
    throw new Error("Failed to fetch structure operators.");
  }
}

/**
 * Toggles a user's admin status for a specific structure.
 *
 * @param {string} structureId - ID of the structure
 * @param {string} targetUid - UID of user to toggle admin status for
 * @param {boolean} shouldBeAdmin - Whether user should be an admin
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function toggleStructureAdminStatus(
  structureId,
  targetUid,
  shouldBeAdmin,
) {
  try {
    const { userUid } = await requireUser();

    // Verify the requester is allowed to modify structure admins
    await verifyStructureAdmin({ userUid, structureId });

    const structureRef = collections.structures().doc(structureId);
    const structureSnap = await structureRef.get();

    if (!structureSnap.exists) {
      logger.warn("Structure not found", { structureId });
      throw new Error("Structure not found");
    }

    const structureData = structureSnap.data();
    const currentAdmins = structureData.admins || [];

    let newAdmins = [...currentAdmins];

    if (shouldBeAdmin) {
      if (!newAdmins.includes(targetUid)) {
        newAdmins.push(targetUid);
      }
    } else {
      newAdmins = newAdmins.filter((id) => id !== targetUid);
    }

    await structureRef.update({
      admins: newAdmins,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    // Log the permission change
    await logResourceModification({
      actorUid: userUid,
      resourceType: "structure",
      resourceId: structureId,
      action: shouldBeAdmin ? "add_admin" : "remove_admin",
      details: { targetUid, newAdmins },
    });

    logger.info("Toggled structure admin status", {
      structureId,
      targetUid,
      shouldBeAdmin,
      actorUid: userUid,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error toggling structure admin", error, {
      structureId,
      targetUid,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Get categories for a structure, with fallback to defaults.
 * Any user with access to the structure can view categories.
 *
 * @param {string} structureId - ID of the structure
 * @returns {Promise<Array>} Array of category objects
 */
export async function getStructureCategories(structureId) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this structure
    await verifyUserPermissions({ userUid, structureId });

    const docRef = collections.structures().doc(structureId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.warn("Structure not found for categories", { structureId });
      // Return defaults if structure doesn't exist
      return serializeFirestoreData(DefaultAccessTypes);
    }

    const data = docSnap.data();

    // Return structure's custom categories or fall back to defaults
    if (
      data.accessCategories &&
      Array.isArray(data.accessCategories) &&
      data.accessCategories.length > 0
    ) {
      return serializeFirestoreData(data.accessCategories);
    }

    return serializeFirestoreData(DefaultAccessTypes);
  } catch (error) {
    logger.error("Error fetching structure categories", error, { structureId });
    // Return defaults on error to avoid breaking the UI
    return serializeFirestoreData(DefaultAccessTypes);
  }
}

/**
 * Update all categories for a structure.
 * Requires Structure Admin or Super Admin.
 *
 * @param {string} structureId - ID of the structure
 * @param {Array} categories - Array of category objects
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateStructureCategories(structureId, categories) {
  try {
    const { userUid } = await requireUser();

    // Verify user is admin of this structure
    await verifyStructureAdmin({ userUid, structureId });

    // Validate categories structure
    if (!Array.isArray(categories)) {
      throw new Error("Categories must be an array");
    }

    for (const cat of categories) {
      if (!cat.value || !cat.label) {
        throw new Error("Each category must have a value and label");
      }
      if (!Array.isArray(cat.subCategories)) {
        throw new Error("Each category must have a subCategories array");
      }
    }

    // Update Firestore
    await collections.structures().doc(structureId).update({
      accessCategories: categories,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    // Log the modification
    await logResourceModification({
      actorUid: userUid,
      resourceType: "structure",
      resourceId: structureId,
      action: "update_categories",
      details: { categoryCount: categories.length },
    });

    logger.info("Structure categories updated", {
      structureId,
      userUid,
      categoryCount: categories.length,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error updating structure categories", error, { structureId });
    return { success: false, error: error.message };
  }
}

/**
 * Add a single subcategory to a structure's category.
 * This is used when users add a new subcategory via "Altro".
 * Any user with access to the structure can add subcategories.
 *
 * @param {string} structureId - ID of the structure
 * @param {string} categoryValue - The value of the category to add to
 * @param {string} newSubcategory - The new subcategory to add
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addSubcategoryToStructure(
  structureId,
  categoryValue,
  newSubcategory,
) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this structure
    await verifyUserPermissions({ userUid, structureId });

    if (
      !newSubcategory ||
      typeof newSubcategory !== "string" ||
      !newSubcategory.trim()
    ) {
      throw new Error("Invalid subcategory");
    }

    const trimmedSubcategory = newSubcategory.trim();

    const docRef = collections.structures().doc(structureId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error("Structure not found");
    }

    const data = docSnap.data();

    // Get current categories or initialize from defaults
    let categories = data.accessCategories;
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      // Deep clone defaults
      categories = JSON.parse(JSON.stringify(DefaultAccessTypes));
    }

    // Find the category and add the subcategory
    const categoryIndex = categories.findIndex(
      (cat) => cat.value === categoryValue,
    );
    if (categoryIndex === -1) {
      throw new Error(`Category "${categoryValue}" not found`);
    }

    // Check if subcategory already exists (case-insensitive)
    const existingSubcats = categories[categoryIndex].subCategories || [];
    const alreadyExists = existingSubcats.some(
      (sub) => sub.toLowerCase() === trimmedSubcategory.toLowerCase(),
    );

    if (alreadyExists) {
      // Not an error, just return success
      return { success: true, alreadyExists: true };
    }

    // Add the new subcategory (before "Altro" if it exists)
    const altroIndex = existingSubcats.indexOf("Altro");
    if (altroIndex !== -1) {
      existingSubcats.splice(altroIndex, 0, trimmedSubcategory);
    } else {
      existingSubcats.push(trimmedSubcategory);
    }

    categories[categoryIndex].subCategories = existingSubcats;

    // Update Firestore
    await docRef.update({
      accessCategories: categories,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    logger.info("Subcategory added to structure", {
      structureId,
      categoryValue,
      newSubcategory: trimmedSubcategory,
      userUid,
    });

    return { success: true, subcategory: trimmedSubcategory };
  } catch (error) {
    logger.error("Error adding subcategory to structure", error, {
      structureId,
      categoryValue,
      newSubcategory,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Reset structure categories to defaults.
 * Requires Structure Admin or Super Admin.
 *
 * @param {string} structureId - ID of the structure
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetStructureCategoriesToDefaults(structureId) {
  try {
    const { userUid } = await requireUser();

    // Verify user is admin of this structure
    await verifyStructureAdmin({ userUid, structureId });

    // Deep clone defaults
    const defaultCategories = JSON.parse(JSON.stringify(DefaultAccessTypes));

    // Update Firestore
    await collections.structures().doc(structureId).update({
      accessCategories: defaultCategories,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    // Log the modification
    await logResourceModification({
      actorUid: userUid,
      resourceType: "structure",
      resourceId: structureId,
      action: "reset_categories",
      details: { resetToDefaults: true },
    });

    logger.info("Structure categories reset to defaults", {
      structureId,
      userUid,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error resetting structure categories", error, {
      structureId,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Creates a new structure.
 * Requires Super Admin privileges.
 * If projectId is provided, the structure will be associated with that project.
 *
 * @param {Object} data - Structure data
 * @param {string} data.name - Structure name (required)
 * @param {string} [data.projectId] - Project ID to associate structure with
 * @param {string} [data.email] - Structure email
 * @param {string} [data.address] - Structure address
 * @param {string} [data.city] - Structure city
 * @param {string} [data.phone] - Structure phone
 * @param {string} [data.description] - Structure description
 * @returns {Promise<{success: boolean, structureId?: string, error?: string}>}
 */
export async function createStructure(data) {
  try {
    const { userUid } = await requireUser();

    // Only super admins can create structures without a project
    // Project admins can create structures via createStructureInProject
    await verifySuperAdmin({ userUid });

    // Validate required fields
    if (
      !data ||
      !data.name ||
      typeof data.name !== "string" ||
      !data.name.trim()
    ) {
      return { success: false, error: "Structure name is required" };
    }

    // If projectId provided, verify project exists
    if (data.projectId) {
      const projectDoc = await collections.projects().doc(data.projectId).get();
      if (!projectDoc.exists) {
        return { success: false, error: "Project not found" };
      }
    }

    const structureData = {
      name: data.name.trim(),
      email: data.email?.trim() || "",
      address: data.address?.trim() || "",
      city: data.city?.trim() || "",
      phone: data.phone?.trim() || "",
      description: data.description?.trim() || "",
      houseSetup: normalizeHouseSetupInput(data.houseSetup),
      projectId: data.projectId || null,
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
      details: {
        structureId: docRef.id,
        name: structureData.name,
        projectId: data.projectId || null,
      },
    });

    logger.info("Created new structure", {
      actorUid: userUid,
      structureId: docRef.id,
      name: structureData.name,
      projectId: data.projectId || null,
    });

    return { success: true, structureId: docRef.id };
  } catch (error) {
    logger.error("Error creating structure", error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// FORM CONFIGURATION FUNCTIONS
// =============================================================================

/**
 * Get form configuration for a structure, with fallback to defaults.
 * Any user with access to the structure can view form configuration.
 *
 * @param {string} structureId - ID of the structure
 * @returns {Promise<Object>} Form configuration object (merged with defaults)
 */
export async function getStructureFormConfig(structureId) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this structure
    await verifyUserPermissions({ userUid, structureId });

    const docRef = collections.structures().doc(structureId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.warn("Structure not found for form config", { structureId });
      // Return defaults if structure doesn't exist
      return serializeFirestoreData(DEFAULT_FORM_CONFIGURATION);
    }

    const data = docSnap.data();

    // Merge structure's custom config with defaults
    // This ensures all fields are present even if only some are customized
    const mergedConfig = mergeWithDefaults(data.formConfiguration);

    return serializeFirestoreData(mergedConfig);
  } catch (error) {
    logger.error("Error fetching structure form config", error, {
      structureId,
    });
    // Return defaults on error to avoid breaking the UI
    return serializeFirestoreData(DEFAULT_FORM_CONFIGURATION);
  }
}

/**
 * Update form configuration for a structure.
 * Requires Structure Admin or Super Admin.
 *
 * @param {string} structureId - ID of the structure
 * @param {Object} config - Form configuration object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateStructureFormConfig(structureId, config) {
  try {
    const { userUid } = await requireUser();

    // Verify user is admin of this structure
    await verifyStructureAdmin({ userUid, structureId });

    // Validate config structure
    if (!config || typeof config !== "object") {
      throw new Error("Configuration must be an object");
    }

    if (!config.sections || typeof config.sections !== "object") {
      throw new Error("Configuration must have a sections object");
    }

    // Validate each section
    for (const [sectionId, sectionConfig] of Object.entries(config.sections)) {
      // Check section exists in definitions
      if (!SECTION_DEFINITIONS[sectionId]) {
        throw new Error(`Unknown section: ${sectionId}`);
      }

      // Validate section structure
      if (typeof sectionConfig.enabled !== "boolean") {
        throw new Error(`Section ${sectionId} must have an enabled boolean`);
      }

      if (typeof sectionConfig.order !== "number") {
        throw new Error(`Section ${sectionId} must have an order number`);
      }

      // Validate fields if present
      if (sectionConfig.fields) {
        for (const [fieldId, fieldConfig] of Object.entries(
          sectionConfig.fields,
        )) {
          // Check field exists in section definition
          if (!SECTION_DEFINITIONS[sectionId].fields[fieldId]) {
            throw new Error(`Unknown field ${fieldId} in section ${sectionId}`);
          }

          // Validate visibility
          const validVisibilities = [
            "required",
            "optional",
            "hidden",
            "conditional",
          ];
          if (
            fieldConfig.visibility &&
            !validVisibilities.includes(fieldConfig.visibility)
          ) {
            throw new Error(
              `Invalid visibility "${fieldConfig.visibility}" for field ${fieldId}`,
            );
          }

          // Validate options if present (must be array or null)
          if (
            fieldConfig.options !== undefined &&
            fieldConfig.options !== null &&
            !Array.isArray(fieldConfig.options)
          ) {
            throw new Error(
              `Options for field ${fieldId} must be an array or null`,
            );
          }
        }
      }
    }

    // Add version and timestamp
    const configToSave = {
      ...config,
      version: config.version || 1,
      lastUpdatedAt: new Date(),
      lastUpdatedBy: userUid,
    };

    // Update Firestore
    await collections.structures().doc(structureId).update({
      formConfiguration: configToSave,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    // Log the modification
    await logResourceModification({
      actorUid: userUid,
      resourceType: "structure",
      resourceId: structureId,
      action: "update_form_config",
      details: { sectionCount: Object.keys(config.sections).length },
    });

    logger.info("Structure form config updated", { structureId, userUid });

    return { success: true };
  } catch (error) {
    logger.error("Error updating structure form config", error, {
      structureId,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Reset structure form configuration to defaults.
 * Requires Structure Admin or Super Admin.
 *
 * @param {string} structureId - ID of the structure
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetStructureFormConfigToDefaults(structureId) {
  try {
    const { userUid } = await requireUser();

    // Verify user is admin of this structure
    await verifyStructureAdmin({ userUid, structureId });

    // Deep clone defaults
    const defaultConfig = JSON.parse(
      JSON.stringify(DEFAULT_FORM_CONFIGURATION),
    );
    defaultConfig.lastUpdatedAt = new Date();
    defaultConfig.lastUpdatedBy = userUid;

    // Update Firestore
    await collections.structures().doc(structureId).update({
      formConfiguration: defaultConfig,
      updatedAt: new Date(),
      updatedBy: userUid,
    });

    // Log the modification
    await logResourceModification({
      actorUid: userUid,
      resourceType: "structure",
      resourceId: structureId,
      action: "reset_form_config",
      details: { resetToDefaults: true },
    });

    logger.info("Structure form config reset to defaults", {
      structureId,
      userUid,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error resetting structure form config", error, {
      structureId,
    });
    return { success: false, error: error.message };
  }
}
