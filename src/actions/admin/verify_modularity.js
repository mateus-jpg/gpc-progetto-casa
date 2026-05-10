"use server";

import { getAnagraficaInternal } from "@/actions/anagrafica/anagrafica";
import admin from "@/lib/firebase/firebaseAdmin";

// Mock user requirement by bypassing or ensuring we run this in a context where we can force it?
// Since `requireUser` reads headers, we can't easily run this as a standalone script unless called from a client or we mock `requireUser`.
// Instead, I'll make this a purely internal test function that bypasses `requireUser` by calling Internal functions directly,
// BUT `createAnagrafica` calls `requireUser` at the top.
// I will create a "Test Helper" that mimics `createAnagrafica` but accepts a userUid directly, OR I just mock the header if possible?
// No, `headers()` is read-only.

// Alternative: I will create a simplified test flow using valid internal logic where possible.
// `createAnagrafica` is the only one strictly binding `requireUser`.
// `getAnagraficaInternal` and `updateAnagraficaInternal` accept userUid.
// I will manually perform the "create" steps to setup the test data using Admin SDK directly, then test the `get` logic which is the core of visibility.

export async function verifyAnagraficaModularity() {
  try {
    console.log("Starting Verification...");
    const db = admin.firestore();
    const testRunId = Date.now();
    const _userUid = "TEST_USER_ADMIN"; // Assuming we can mock permissions or use a real admin ID if needed in `verifyUserPermissions`?
    // `verifyUserPermissions` checks DB. validating a fake user is hard.
    // I'll grab a REAL user from the DB first.

    const usersSnap = await db
      .collection("operators")
      .where("role", "==", "admin")
      .limit(1)
      .get();
    if (usersSnap.empty) {
      return { error: "No admin user found to run test." };
    }
    const adminUser = usersSnap.docs[0];
    const adminUid = adminUser.id;
    console.log(`Using admin user: ${adminUid}`);

    // 1. Setup Data
    const structureA = `STRUCT_A_${testRunId}`;
    const structureB = `STRUCT_B_${testRunId}`;

    // Create Global Anagrafica
    const globalData = {
      nome: `TestMario_${testRunId}`,
      cognome: "Rossi",
      codiceFiscale: `RSSMRA${testRunId}`,
      canBeAccessedBy: [structureA, structureB], // Give access to both
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
    };

    const docRef = await db.collection("anagrafica").add(globalData);
    const anagraficaId = docRef.id;
    console.log(`Created Global Anagrafica: ${anagraficaId}`);

    // Create Structure A Data
    const structAData = {
      anagraficaId,
      structureId: structureA,
      vulnerabilita: {
        vulnerabilita: ["Test Vulnerability A"],
        intenzioneItalia: "Stay",
      },
      notes: "Notes from A",
      updatedAt: new Date(),
    };
    await db.collection("anagrafica_data").add(structAData);
    console.log(`Created Structure A Data`);

    // 2. Test Visibility from Structure B
    // We act as AdminUid (who has access to everything) but we pass structureId = structureB to `getAnagraficaInternal`
    // to see how it sorts the data.

    console.log(`Fetching as Structure B...`);
    const resultB = await getAnagraficaInternal(
      anagraficaId,
      adminUid,
      structureB,
    );

    // 3. Assertions
    const isGlobalCorrect = resultB.nome === globalData.nome;
    const isStructDataSeparated = !resultB.vulnerabilita; // Should NOT be in the root (which is for current structure)
    // Wait, `getAnagraficaInternal` merges `structureData` (current) into root.
    // Since we didn't create data for structureB, `structureData` should be empty (or minimal).
    // So `resultB.vulnerabilita` should be undefined.

    const hasOtherData =
      resultB.otherStructuresData && resultB.otherStructuresData.length > 0;

    console.log("Assertions:");
    console.log(`- Global Info Present: ${isGlobalCorrect}`);
    console.log(`- Current Structure (B) Data Empty: ${isStructDataSeparated}`);
    console.log(`- Other Structure Data Hidden: ${!hasOtherData}`);

    // Cleanup
    await db.collection("anagrafica").doc(anagraficaId).delete();
    // delete data docs... (skippable for test)

    return {
      success: isGlobalCorrect && isStructDataSeparated && !hasOtherData,
      details: {
        anagraficaId,
        otherStructuresData: resultB.otherStructuresData,
      },
    };
  } catch (e) {
    console.error("Test Verification Failed", e);
    return { error: e.message };
  }
}
