import { computeGroupChanges } from "@/utils/anagraficaUtils";
import { createHistoryEntry } from "@/actions/anagrafica/history";

export async function createRegistrationHistoryEntries({
  anagraficaId,
  existingDoc,
  globalData,
  existingStructureData,
  structureData,
  structureDataId,
  userUid,
  userMail,
  structureId,
}) {
  if (!existingDoc) {
    await createHistoryEntry({
      anagraficaId,
      changeType: "create",
      changedGroups: ["anagrafica"],
      changes: {
        anagrafica: {
          before: null,
          after: globalData.anagrafica,
        },
      },
      userUid,
      userMail,
      structureId,
    });
  }

  const structureChangedGroups = [];
  const structureChanges = {};
  const structureChangeSet = computeGroupChanges(
    existingStructureData?.data || {},
    structureData,
  );

  structureChangeSet.changedGroups.forEach((group) => {
    structureChangedGroups.push(group);
    structureChanges[group] = structureChangeSet.changes[group];
  });

  if (structureChangedGroups.length > 0 && structureDataId) {
    await createHistoryEntry({
      anagraficaId,
      changeType: existingStructureData ? "update" : "create",
      changedGroups: structureChangedGroups,
      changes: structureChanges,
      userUid,
      userMail,
      structureId,
      structureDataId,
    });
  }
}
