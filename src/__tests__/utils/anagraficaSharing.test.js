import { describe, expect, it } from "vitest";
import {
  buildSharedStructurePayload,
  getOutgoingSharedFields,
  normalizeSharedFields,
  removeSharedDataGrantsForStructure,
  sanitizeSharedDataGrants,
  upsertSharedDataGrants,
} from "@/utils/anagraficaSharing";

describe("anagraficaSharing utilities", () => {
  it("normalizes shared fields against the allowlist", () => {
    expect(
      normalizeSharedFields([
        "notes",
        "notes",
        "invalid-field",
        "vulnerabilita",
      ]),
    ).toEqual(["notes", "vulnerabilita"]);
  });

  it("deduplicates grants by source and target pair", () => {
    const grants = sanitizeSharedDataGrants([
      {
        sourceStructureId: "structure-a",
        targetStructureId: "structure-b",
        sharedFields: ["notes"],
        updatedAt: "old",
      },
      {
        sourceStructureId: "structure-a",
        targetStructureId: "structure-b",
        sharedFields: ["vulnerabilita", "notes"],
        updatedAt: "new",
      },
    ]);

    expect(grants).toHaveLength(1);
    expect(grants[0].sharedFields).toEqual(["vulnerabilita", "notes"]);
    expect(grants[0].updatedAt).toBe("new");
  });

  it("upserts grants and preserves creation metadata when updating", () => {
    const now = new Date("2026-04-16T10:00:00.000Z");
    const updated = upsertSharedDataGrants(
      [
        {
          sourceStructureId: "structure-a",
          targetStructureId: "structure-b",
          sharedFields: ["notes"],
          createdAt: "2026-04-10T10:00:00.000Z",
          createdBy: "user-1",
        },
      ],
      {
        sourceStructureId: "structure-a",
        targetStructureIds: ["structure-b", "structure-c"],
        sharedFields: ["vulnerabilita"],
        actorUid: "user-2",
        now,
      },
    );

    expect(updated).toHaveLength(2);
    expect(updated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceStructureId: "structure-a",
          targetStructureId: "structure-b",
          sharedFields: ["vulnerabilita"],
          createdAt: "2026-04-10T10:00:00.000Z",
          createdBy: "user-1",
          updatedAt: now,
          updatedBy: "user-2",
        }),
        expect.objectContaining({
          sourceStructureId: "structure-a",
          targetStructureId: "structure-c",
          sharedFields: ["vulnerabilita"],
          createdAt: now,
          createdBy: "user-2",
        }),
      ]),
    );
  });

  it("removes grants when a structure leaves the record", () => {
    const remaining = removeSharedDataGrantsForStructure(
      [
        {
          sourceStructureId: "structure-a",
          targetStructureId: "structure-b",
          sharedFields: ["notes"],
        },
        {
          sourceStructureId: "structure-c",
          targetStructureId: "structure-d",
          sharedFields: ["notes"],
        },
      ],
      "structure-b",
    );

    expect(remaining).toEqual([
      {
        sourceStructureId: "structure-c",
        targetStructureId: "structure-d",
        sharedFields: ["notes"],
        createdAt: null,
        createdBy: null,
        updatedAt: null,
        updatedBy: null,
      },
    ]);
  });

  it("returns outgoing shared fields for a specific pair", () => {
    expect(
      getOutgoingSharedFields(
        [
          {
            sourceStructureId: "structure-a",
            targetStructureId: "structure-b",
            sharedFields: ["notes", "vulnerabilita"],
          },
        ],
        "structure-a",
        "structure-b",
      ),
    ).toEqual(["notes", "vulnerabilita"]);
  });

  it("builds a visible payload only from approved populated fields", () => {
    expect(
      buildSharedStructurePayload(
        {
          notes: "Visible note",
          vulnerabilita: { vulnerabilita: ["Fragile"] },
          referral: null,
          lavoroFormazione: {},
        },
        ["notes", "referral", "lavoroFormazione", "vulnerabilita"],
      ),
    ).toEqual({
      notes: "Visible note",
      vulnerabilita: { vulnerabilita: ["Fragile"] },
    });
  });
});
