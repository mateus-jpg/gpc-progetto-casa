"use server";

import { revalidatePath } from "next/cache";
import admin from "@/lib/firebase/firebaseAdmin";
import {
  APPLIANCE_DEFAULTS,
  ASSESSMENT_ITEM_MAP,
  ASSESSMENT_ITEMS,
  COMMON_SPACE_OPTIONS,
  GRP_ITEMS,
} from "@/lib/group-home/catalog";
import { serializeFirestoreData } from "@/lib/utils";
import { requireUser, verifyUserPermissions } from "@/utils/server-auth";

const db = admin.firestore();

const COLLECTIONS = {
  evaluations: "yak_evaluations",
  groupActivities: "group_activities",
  groupEvaluations: "group_evaluations",
  houseProfiles: "house_profiles",
  individualMonitorings: "individual_monitorings",
  interventions: "interventions",
  pattiAccoglienza: "patti_accoglienza",
  personalProjects: "personal_projects",
  selfAssessments: "self_assessments",
};

function ensureString(value) {
  return String(value || "").trim();
}

function ensureStringArray(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(ensureString).filter(Boolean))];
}

function ensureDateString(value) {
  const normalized = ensureString(value);
  if (!normalized) return "";
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function ensureNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortByDateDesc(entries, key) {
  return [...entries].sort((a, b) => {
    const aTime = new Date(a?.[key] || a?.updatedAt || 0).getTime();
    const bTime = new Date(b?.[key] || b?.updatedAt || 0).getTime();
    return bTime - aTime;
  });
}

function buildProjectDocId(structureId, anagraficaId) {
  return `${structureId}__${anagraficaId}`;
}

function serializeDoc(doc) {
  return serializeFirestoreData({ id: doc.id, ...doc.data() });
}

function createDefaultHouseAppliances(appliances = []) {
  const normalizedMap = new Map(
    (Array.isArray(appliances) ? appliances : []).map((item) => [
      ensureString(item?.name),
      {
        functioning: Boolean(item?.functioning),
        notes: ensureString(item?.notes),
        ownership: ensureString(item?.ownership),
        present: Boolean(item?.present),
      },
    ]),
  );

  return APPLIANCE_DEFAULTS.map((name) => {
    const existing = normalizedMap.get(name);
    return {
      name,
      present: existing?.present || false,
      functioning: existing?.functioning || false,
      ownership: existing?.ownership || "",
      notes: existing?.notes || "",
    };
  });
}

function normalizeResponses(responses = {}) {
  const allowedValues = new Set(["0", "1", "2", "3", "na"]);
  return Object.fromEntries(
    ASSESSMENT_ITEMS.map((item) => {
      const raw = responses?.[item.id] || {};
      const value = ensureString(raw.value);
      return [
        item.id,
        {
          value: allowedValues.has(value) ? value : "",
          note: ensureString(raw.note),
        },
      ];
    }),
  );
}

function normalizeGoalsByArea(goalsByArea = {}) {
  return Object.fromEntries(
    ["PER", "ABI", "ECO", "REL"].map((areaId) => {
      const areaGoals = Array.isArray(goalsByArea?.[areaId])
        ? goalsByArea[areaId]
        : [];

      const normalized = areaGoals
        .map((goal) => ({
          goal: ensureString(goal?.goal),
          linkedItemIds: ensureStringArray(goal?.linkedItemIds),
          timeframe: ensureString(goal?.timeframe),
          successIndicators: ensureString(goal?.successIndicators),
        }))
        .filter(
          (goal) =>
            goal.goal ||
            goal.linkedItemIds.length > 0 ||
            goal.timeframe ||
            goal.successIndicators,
        );

      return [areaId, normalized];
    }),
  );
}

function normalizeHouseProfileInput(payload = {}) {
  const commonSpaces = ensureStringArray(payload.commonSpaces).filter(
    (value) => COMMON_SPACE_OPTIONS.includes(value) || value === "Altro",
  );

  return {
    address: ensureString(payload.address),
    operatorName: ensureString(payload.operatorName),
    compiledAt: ensureDateString(payload.compiledAt),
    updatedAt: ensureDateString(payload.updatedAt),
    residentIds: ensureStringArray(payload.residentIds),
    contract: {
      type: ensureString(payload.contract?.type),
      otherType: ensureString(payload.contract?.otherType),
      propertyOwner: ensureString(payload.contract?.propertyOwner),
      rentContractHolder: ensureString(payload.contract?.rentContractHolder),
      subleaseContractHolder: ensureString(
        payload.contract?.subleaseContractHolder,
      ),
      startDate: ensureDateString(payload.contract?.startDate),
      endDate: ensureDateString(payload.contract?.endDate),
      depositAmount: ensureNumber(payload.contract?.depositAmount),
      monthlyRent: ensureNumber(payload.contract?.monthlyRent),
      paymentMethod: ensureString(payload.contract?.paymentMethod),
      paymentMethodOther: ensureString(payload.contract?.paymentMethodOther),
      monthlyDueDay: ensureString(payload.contract?.monthlyDueDay),
      importantDeadlines: ensureString(payload.contract?.importantDeadlines),
    },
    safety: {
      mainElectricalSwitchLocation: ensureString(
        payload.safety?.mainElectricalSwitchLocation,
      ),
      gasValveLocation: ensureString(payload.safety?.gasValveLocation),
      waterValveLocation: ensureString(payload.safety?.waterValveLocation),
    },
    utilities: {
      counters: {
        water: ensureString(payload.utilities?.counters?.water),
        electricity: ensureString(payload.utilities?.counters?.electricity),
        gas: ensureString(payload.utilities?.counters?.gas),
      },
      electricity: {
        accountHolder: ensureString(
          payload.utilities?.electricity?.accountHolder,
        ),
        vendorName: ensureString(payload.utilities?.electricity?.vendorName),
        customerCode: ensureString(
          payload.utilities?.electricity?.customerCode,
        ),
        pod: ensureString(payload.utilities?.electricity?.pod),
        transferNotes: ensureString(
          payload.utilities?.electricity?.transferNotes,
        ),
      },
      gas: {
        accountHolder: ensureString(payload.utilities?.gas?.accountHolder),
        vendorName: ensureString(payload.utilities?.gas?.vendorName),
        customerCode: ensureString(payload.utilities?.gas?.customerCode),
        pdr: ensureString(payload.utilities?.gas?.pdr),
        transferNotes: ensureString(payload.utilities?.gas?.transferNotes),
      },
      water: {
        accountHolder: ensureString(payload.utilities?.water?.accountHolder),
        vendorName: ensureString(payload.utilities?.water?.vendorName),
        customerCode: ensureString(payload.utilities?.water?.customerCode),
        serviceNumber: ensureString(payload.utilities?.water?.serviceNumber),
        transferNotes: ensureString(payload.utilities?.water?.transferNotes),
      },
      tari: {
        accountHolder: ensureString(payload.utilities?.tari?.accountHolder),
        paymentMode: ensureString(payload.utilities?.tari?.paymentMode),
      },
      internetPhone: {
        accountHolder: ensureString(
          payload.utilities?.internetPhone?.accountHolder,
        ),
        monthlyCost: ensureNumber(
          payload.utilities?.internetPhone?.monthlyCost,
        ),
      },
      billReceiver: ensureString(payload.utilities?.billReceiver),
      billReceiverOther: ensureString(payload.utilities?.billReceiverOther),
      billPayer: ensureString(payload.utilities?.billPayer),
      billPayerOther: ensureString(payload.utilities?.billPayerOther),
    },
    expenses: {
      condominiumIncluded:
        payload.expenses?.condominiumIncluded === null
          ? null
          : Boolean(payload.expenses?.condominiumIncluded),
      condominiumAverageCost: ensureNumber(
        payload.expenses?.condominiumAverageCost,
      ),
      extraordinaryExpenses: ensureString(
        payload.expenses?.extraordinaryExpenses,
      ),
      cashFundEnabled: Boolean(payload.expenses?.cashFundEnabled),
      cashFundNotes: ensureString(payload.expenses?.cashFundNotes),
    },
    appliances: createDefaultHouseAppliances(payload.appliances),
    maintenance: {
      ordinary: {
        boilerTechnician: ensureString(
          payload.maintenance?.ordinary?.boilerTechnician,
        ),
        boilerContact: ensureString(
          payload.maintenance?.ordinary?.boilerContact,
        ),
        conditionerTechnician: ensureString(
          payload.maintenance?.ordinary?.conditionerTechnician,
        ),
        conditionerContact: ensureString(
          payload.maintenance?.ordinary?.conditionerContact,
        ),
        nextInterventionAt: ensureDateString(
          payload.maintenance?.ordinary?.nextInterventionAt,
        ),
      },
      usefulContacts: {
        propertyEntity: ensureString(
          payload.maintenance?.usefulContacts?.propertyEntity,
        ),
        propertyEntityContact: ensureString(
          payload.maintenance?.usefulContacts?.propertyEntityContact,
        ),
        plumber: ensureString(payload.maintenance?.usefulContacts?.plumber),
        plumberContact: ensureString(
          payload.maintenance?.usefulContacts?.plumberContact,
        ),
        electrician: ensureString(
          payload.maintenance?.usefulContacts?.electrician,
        ),
        electricianContact: ensureString(
          payload.maintenance?.usefulContacts?.electricianContact,
        ),
        condominiumAdmin: ensureString(
          payload.maintenance?.usefulContacts?.condominiumAdmin,
        ),
        condominiumAdminContact: ensureString(
          payload.maintenance?.usefulContacts?.condominiumAdminContact,
        ),
      },
      emergencyReportingContact: ensureString(
        payload.maintenance?.emergencyReportingContact,
      ),
    },
    commonAreas: {
      wasteCollectionSchedule: ensureString(
        payload.commonAreas?.wasteCollectionSchedule,
      ),
      commonSpaces,
      otherCommonSpace: ensureString(payload.commonAreas?.otherCommonSpace),
      quietHours: ensureString(payload.commonAreas?.quietHours),
      cleaningRules: ensureString(payload.commonAreas?.cleaningRules),
    },
    notes: ensureString(payload.notes),
  };
}

function normalizePersonalProjectInput(payload = {}) {
  return {
    operatorName: ensureString(payload.operatorName),
    compilationDate: ensureDateString(payload.compilationDate),
    plannedReviewDate: ensureDateString(payload.plannedReviewDate),
    observationsSharedAt: ensureDateString(payload.observationsSharedAt),
    actionsSharedAt: ensureDateString(payload.actionsSharedAt),
    observations: {
      PER: ensureString(payload.observations?.PER),
      ABI: ensureString(payload.observations?.ABI),
      ECO: ensureString(payload.observations?.ECO),
      REL: ensureString(payload.observations?.REL),
    },
    feelings: {
      strengths: ensureString(payload.feelings?.strengths),
      difficulties: ensureString(payload.feelings?.difficulties),
      aspirations: ensureString(payload.feelings?.aspirations),
    },
    facts: {
      documentsOwned: ensureStringArray(payload.facts?.documentsOwned),
      motherTongue: ensureString(payload.facts?.motherTongue),
      otherLanguages: ensureString(payload.facts?.otherLanguages),
      incomeTypes: ensureStringArray(payload.facts?.incomeTypes),
      averageMonthlyIncome: ensureNumber(payload.facts?.averageMonthlyIncome),
    },
    goalsByArea: normalizeGoalsByArea(payload.goalsByArea),
    otherGoals: ensureString(payload.otherGoals),
    sharing: {
      guestName: ensureString(payload.sharing?.guestName),
      guestSignatureName: ensureString(payload.sharing?.guestSignatureName),
      operatorSignatureName: ensureString(
        payload.sharing?.operatorSignatureName,
      ),
      sharedAt: ensureDateString(payload.sharing?.sharedAt),
      nextReviewAt: ensureDateString(payload.sharing?.nextReviewAt),
    },
  };
}

function normalizeAssessmentEntryInput(payload = {}) {
  return {
    operatorName: ensureString(payload.operatorName),
    compiledAt: ensureDateString(payload.compiledAt),
    reviewAt: ensureDateString(payload.reviewAt),
    sequenceNumber: ensureString(payload.sequenceNumber),
    previousRecordedAt: ensureDateString(payload.previousRecordedAt),
    projectReferenceAt: ensureDateString(payload.projectReferenceAt),
    serviceName: ensureString(payload.serviceName),
    notes: ensureString(payload.notes),
    facts: {
      documentsOwned: ensureStringArray(payload.facts?.documentsOwned),
      motherTongue: ensureString(payload.facts?.motherTongue),
      otherLanguages: ensureString(payload.facts?.otherLanguages),
      incomeTypes: ensureStringArray(payload.facts?.incomeTypes),
      averageMonthlyIncome: ensureNumber(payload.facts?.averageMonthlyIncome),
    },
    selfOverview: {
      strength: ensureString(payload.selfOverview?.strength),
      improve: ensureString(payload.selfOverview?.improve),
      help: ensureString(payload.selfOverview?.help),
    },
    qualitative: {
      andamento: ensureString(payload.qualitative?.andamento),
      puntiDiForza: ensureString(payload.qualitative?.puntiDiForza),
      criticita: ensureString(payload.qualitative?.criticita),
      eventiSignificativi: ensureString(
        payload.qualitative?.eventiSignificativi,
      ),
      relazioneProgetto: ensureString(payload.qualitative?.relazioneProgetto),
    },
    synthetic: {
      status: ensureString(payload.synthetic?.status),
      motivation: ensureString(payload.synthetic?.motivation),
    },
    nextActions: normalizeLinkedActions(payload.nextActions),
    sharing: {
      operatorSignatureName: ensureString(
        payload.sharing?.operatorSignatureName,
      ),
      equipeSharedAt: ensureDateString(payload.sharing?.equipeSharedAt),
      personSharedAt: ensureDateString(payload.sharing?.personSharedAt),
    },
    responses: normalizeResponses(payload.responses),
  };
}

function normalizeLinkedActions(actions = []) {
  return Array.isArray(actions)
    ? actions
        .map((action) => ({
          action: ensureString(action?.action),
          dueAt: ensureDateString(action?.dueAt),
          linkedItemIds: ensureStringArray(action?.linkedItemIds).filter(
            (itemId) => ASSESSMENT_ITEM_MAP[itemId],
          ),
        }))
        .filter(
          (action) =>
            action.action || action.dueAt || action.linkedItemIds.length > 0,
        )
        .slice(0, 12)
    : [];
}

function normalizeGrpResponses(grpResponses = {}) {
  const allowedValues = new Set(["0", "1", "2", "3", "na"]);
  return Object.fromEntries(
    GRP_ITEMS.map((item) => {
      const raw = grpResponses?.[item.id] || {};
      const value = ensureString(raw.value);
      return [
        item.id,
        {
          value: allowedValues.has(value) ? value : "",
          note: ensureString(raw.note),
        },
      ];
    }),
  );
}

function normalizeGroupActivityInput(payload = {}, residents = []) {
  const residentMap = new Map(
    residents.map((resident) => [resident.id, resident]),
  );
  const allowedValues = new Set(["0", "1", "2", "3", "na"]);
  const participants = Array.isArray(payload.participants)
    ? payload.participants
        .map((participant) => {
          const resident = residentMap.get(
            ensureString(participant?.anagraficaId),
          );
          if (!resident) return null;

          return {
            anagraficaId: resident.id,
            name: resident.name,
            present: Boolean(participant?.present),
            participationNote: ensureString(participant?.participationNote),
          };
        })
        .filter(Boolean)
    : [];

  const individualItems = Array.isArray(payload.individualItems)
    ? payload.individualItems
        .map((it) => {
          const itemId = ensureString(it?.itemId);
          const anagraficaId = ensureString(it?.anagraficaId);
          const resident = residentMap.get(anagraficaId);
          const value = ensureString(it?.value);

          if (!itemId || !ASSESSMENT_ITEM_MAP[itemId] || !resident) {
            return null;
          }

          return {
            anagraficaId: resident.id,
            name: resident.name,
            itemId,
            note: ensureString(it?.note || it?.notes),
            value: allowedValues.has(value) ? value : "",
          };
        })
        .filter(Boolean)
        .slice(0, 30)
    : [];

  return {
    activityNumber: ensureString(payload.activityNumber),
    activityType: ensureString(payload.activityType),
    activityTypeOther: ensureString(payload.activityTypeOther),
    description: ensureString(payload.description),
    educatorNotes: ensureString(payload.educatorNotes),
    endTime: ensureString(payload.endTime),
    grpResponses: normalizeGrpResponses(payload.grpResponses),
    happenedAt: ensureDateString(payload.happenedAt),
    individualItems,
    locationOther: ensureString(payload.locationOther),
    locationType: ensureString(payload.locationType),
    nextActivityAt: ensureDateString(payload.nextActivityAt),
    nextCommitmentsGroup: ensureString(payload.nextCommitmentsGroup),
    nextCommitmentsOperator: ensureString(payload.nextCommitmentsOperator),
    operatorName: ensureString(payload.operatorName),
    participants,
    startTime: ensureString(payload.startTime),
  };
}

function normalizeGroupEvaluationInput(payload = {}) {
  return {
    agreedActions: ensureString(payload.agreedActions),
    criticalIssues: ensureString(payload.criticalIssues),
    evaluatedAt: ensureDateString(payload.evaluatedAt),
    followUpAt: ensureDateString(payload.followUpAt),
    groupSelfResponses: normalizeGrpResponses(payload.groupSelfResponses),
    grpResponses: normalizeGrpResponses(payload.grpResponses),
    notes: ensureString(payload.notes),
    operatorName: ensureString(payload.operatorName),
    periodLabel: ensureString(payload.periodLabel),
    puntiDiForza: ensureString(payload.puntiDiForza),
    valutazioneSintetica: ensureString(payload.valutazioneSintetica),
  };
}

function normalizePattoInput(payload = {}) {
  return {
    destinationHouse: ensureString(payload.destinationHouse),
    endDate: ensureDateString(payload.endDate),
    monthlyQuotaAgreed: ensureNumber(payload.monthlyQuotaAgreed),
    monthlyQuotaRequired: ensureNumber(payload.monthlyQuotaRequired),
    notesCuraSpazi: ensureString(payload.notesCuraSpazi),
    notesConvivenza: ensureString(payload.notesConvivenza),
    notesVicinato: ensureString(payload.notesVicinato),
    operatorSignatureDate: ensureDateString(payload.operatorSignatureDate),
    operatorSignatureName: ensureString(payload.operatorSignatureName),
    paymentDueDay: ensureString(payload.paymentDueDay),
    paymentMethod: ensureString(payload.paymentMethod),
    paymentMethodOther: ensureString(payload.paymentMethodOther),
    personContacts: ensureString(payload.personContacts),
    personName: ensureString(payload.personName),
    personSignatureDate: ensureDateString(payload.personSignatureDate),
    personSignatureName: ensureString(payload.personSignatureName),
    prerequisites: {
      acceptsPatto: Boolean(payload.prerequisites?.acceptsPatto),
      acceptsRegolamento: Boolean(payload.prerequisites?.acceptsRegolamento),
      hasDocuments: Boolean(payload.prerequisites?.hasDocuments),
      hasIncome: Boolean(payload.prerequisites?.hasIncome),
    },
    serviceContacts: ensureString(payload.serviceContacts),
    serviceName: ensureString(payload.serviceName),
    startDate: ensureDateString(payload.startDate),
  };
}

function normalizeInterventionInput(payload = {}) {
  const allowedValues = new Set(["0", "1", "2", "3", "na"]);
  const items = Array.isArray(payload.items)
    ? payload.items
        .filter((it) => it?.itemId && ASSESSMENT_ITEM_MAP[it.itemId])
        .slice(0, 3)
        .map((it) => {
          const value = ensureString(it.value);
          return {
            itemId: ensureString(it.itemId),
            value: allowedValues.has(value) ? value : "",
            note: ensureString(it.note),
          };
        })
    : [];

  return {
    diary: ensureString(payload.diary),
    durationMinutes: ensureNumber(payload.durationMinutes),
    equipeNotes: ensureString(payload.equipeNotes),
    happenedAt: ensureDateString(payload.happenedAt),
    interventionNumber: ensureString(payload.interventionNumber),
    interventionType: ensureString(payload.interventionType),
    interventionTypeOther: ensureString(payload.interventionTypeOther),
    items,
    linkedGoals: ensureString(payload.linkedGoals),
    locationSpecific: ensureString(payload.locationSpecific),
    locationType: ensureString(payload.locationType),
    nextAppointmentAt: ensureDateString(payload.nextAppointmentAt),
    nextStepsOperator: ensureString(payload.nextStepsOperator),
    nextStepsPerson: ensureString(payload.nextStepsPerson),
    operatorName: ensureString(payload.operatorName),
    startTime: ensureString(payload.startTime),
    whoPresent: ensureStringArray(payload.whoPresent),
    whoPresentOther: ensureString(payload.whoPresentOther),
  };
}

async function ensureStructureAccess(structureId) {
  const { userUid } = await requireUser();
  await verifyUserPermissions({ userUid, structureId });
  return userUid;
}

async function ensureAnagraficaAccess(structureId, anagraficaId) {
  const userUid = await ensureStructureAccess(structureId);
  const anagraficaRef = db.collection("anagrafica").doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();

  if (!anagraficaSnap.exists) {
    throw new Error("Scheda persona non trovata");
  }

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures =
    anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  await verifyUserPermissions({ userUid, allowedStructures, structureId });

  if (!allowedStructures.includes(structureId)) {
    throw new Error("La persona non appartiene a questa casa");
  }

  return {
    userUid,
    anagrafica: serializeFirestoreData({
      id: anagraficaSnap.id,
      ...anagraficaData,
    }),
  };
}

async function getStructureResidentsInternal(structureId) {
  const snapshot = await db
    .collection("anagrafica")
    .where("canBeAccessedBy", "array-contains", structureId)
    .where("deleted", "!=", true)
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data() || {};
      const firstName = ensureString(data.anagrafica?.nome);
      const lastName = ensureString(data.anagrafica?.cognome);
      return {
        id: doc.id,
        name:
          [firstName, lastName].filter(Boolean).join(" ") ||
          "Persona senza nome",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
}

function revalidateGroupHomePaths(
  structureId,
  anagraficaId = null,
  extraPath = null,
) {
  revalidatePath(`/${structureId}`);
  if (anagraficaId) {
    revalidatePath(`/${structureId}/anagrafica/${anagraficaId}`);
  }
  if (extraPath) {
    revalidatePath(extraPath);
  }
}

function buildEvaluationRows({
  anagraficaId = null,
  entryId,
  recordedAt,
  responses = {},
  source,
  structureId,
}) {
  return Object.entries(responses)
    .filter(([, response]) => response?.value)
    .map(([itemId, response]) => ({
      anagraficaId,
      itemId,
      note: ensureString(response.note),
      recordedAt,
      source,
      sourceEntryId: entryId,
      structureId,
      value: ensureString(response.value),
    }));
}

async function replaceEvaluationRows(sourceEntryId, rows = []) {
  const existing = await db
    .collection(COLLECTIONS.evaluations)
    .where("sourceEntryId", "==", sourceEntryId)
    .get();

  const batch = db.batch();
  existing.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  rows.forEach((row) => {
    const ref = db.collection(COLLECTIONS.evaluations).doc();
    batch.set(ref, {
      ...row,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  await batch.commit();
}

async function replaceAssessmentEvaluationRows({
  anagraficaId,
  entry,
  entryId,
  source,
  structureId,
}) {
  await replaceEvaluationRows(
    entryId,
    buildEvaluationRows({
      anagraficaId,
      entryId,
      recordedAt: entry.compiledAt,
      responses: entry.responses,
      source,
      structureId,
    }),
  );
}

async function replaceInterventionEvaluationRows({
  anagraficaId,
  entry,
  entryId,
  structureId,
}) {
  await replaceEvaluationRows(
    entryId,
    buildEvaluationRows({
      anagraficaId,
      entryId,
      recordedAt: entry.happenedAt,
      responses: Object.fromEntries(
        (entry.items || []).map((item) => [
          item.itemId,
          { note: item.note, value: item.value },
        ]),
      ),
      source: "intervento",
      structureId,
    }),
  );
}

async function replaceGroupActivityEvaluationRows({
  entry,
  entryId,
  structureId,
}) {
  const grpRows = buildEvaluationRows({
    entryId,
    recordedAt: entry.happenedAt,
    responses: entry.grpResponses,
    source: "attivita_gruppo",
    structureId,
  });

  const individualRows = (entry.individualItems || [])
    .filter((item) => item.value)
    .map((item) => ({
      anagraficaId: item.anagraficaId,
      itemId: item.itemId,
      note: item.note,
      recordedAt: entry.happenedAt,
      source: "attivita_gruppo_individuale",
      sourceEntryId: entryId,
      structureId,
      value: item.value,
    }));

  await replaceEvaluationRows(entryId, [...grpRows, ...individualRows]);
}

async function replaceGroupEvaluationRows({ entry, entryId, structureId }) {
  const operatorRows = buildEvaluationRows({
    entryId,
    recordedAt: entry.evaluatedAt,
    responses: entry.grpResponses,
    source: "valutazione_gruppo",
    structureId,
  });
  const selfRows = buildEvaluationRows({
    entryId,
    recordedAt: entry.evaluatedAt,
    responses: entry.groupSelfResponses,
    source: "autovalutazione_gruppo",
    structureId,
  });

  await replaceEvaluationRows(entryId, [...operatorRows, ...selfRows]);
}

export async function getStructureResidents(structureId) {
  await ensureStructureAccess(structureId);
  return await getStructureResidentsInternal(structureId);
}

export async function getJourneyPersonSummary(structureId, anagraficaId) {
  const { anagrafica } = await ensureAnagraficaAccess(
    structureId,
    anagraficaId,
  );
  return anagrafica;
}

export async function getHouseProfile(structureId) {
  await ensureStructureAccess(structureId);
  const snapshot = await db
    .collection(COLLECTIONS.houseProfiles)
    .doc(structureId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return serializeDoc(snapshot);
}

export async function upsertHouseProfile(structureId, payload) {
  const userUid = await ensureStructureAccess(structureId);
  const normalized = normalizeHouseProfileInput(payload);
  const residents = await getStructureResidentsInternal(structureId);
  const ref = db.collection(COLLECTIONS.houseProfiles).doc(structureId);
  const existing = await ref.get();
  const previousData = existing.exists ? existing.data() || {} : {};

  const nextData = {
    ...previousData,
    ...normalized,
    residentIds: residents.map((resident) => resident.id),
    structureId,
    createdAt: previousData.createdAt || new Date().toISOString(),
    createdBy: previousData.createdBy || userUid,
    updatedAt: new Date().toISOString(),
    updatedBy: userUid,
  };

  await ref.set(nextData, { merge: true });
  revalidateGroupHomePaths(structureId);

  return {
    success: true,
    houseProfile: serializeFirestoreData({ id: structureId, ...nextData }),
  };
}

export async function getPersonalProject(structureId, anagraficaId) {
  await ensureAnagraficaAccess(structureId, anagraficaId);
  const snapshot = await db
    .collection(COLLECTIONS.personalProjects)
    .doc(buildProjectDocId(structureId, anagraficaId))
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return serializeDoc(snapshot);
}

export async function upsertPersonalProject(
  structureId,
  anagraficaId,
  payload,
) {
  const { userUid } = await ensureAnagraficaAccess(structureId, anagraficaId);
  const normalized = normalizePersonalProjectInput(payload);
  const docId = buildProjectDocId(structureId, anagraficaId);
  const ref = db.collection(COLLECTIONS.personalProjects).doc(docId);
  const existing = await ref.get();
  const previousData = existing.exists ? existing.data() || {} : {};

  const nextData = {
    ...previousData,
    ...normalized,
    structureId,
    anagraficaId,
    createdAt: previousData.createdAt || new Date().toISOString(),
    createdBy: previousData.createdBy || userUid,
    updatedAt: new Date().toISOString(),
    updatedBy: userUid,
  };

  await ref.set(nextData, { merge: true });
  revalidateGroupHomePaths(
    structureId,
    anagraficaId,
    `/${structureId}/anagrafica/${anagraficaId}/progetto-personalizzato`,
  );

  return {
    success: true,
    project: serializeFirestoreData({ id: docId, ...nextData }),
  };
}

async function listAssessmentEntries(
  collectionName,
  structureId,
  anagraficaId,
) {
  await ensureAnagraficaAccess(structureId, anagraficaId);
  const snapshot = await db
    .collection(collectionName)
    .where("anagraficaId", "==", anagraficaId)
    .get();

  return sortByDateDesc(
    snapshot.docs
      .map((doc) => serializeDoc(doc))
      .filter((entry) => entry.structureId === structureId),
    "compiledAt",
  );
}

async function saveAssessmentEntry(
  collectionName,
  structureId,
  anagraficaId,
  payload,
  entryId = null,
) {
  const { userUid } = await ensureAnagraficaAccess(structureId, anagraficaId);
  const normalized = normalizeAssessmentEntryInput(payload);
  const ref = entryId
    ? db.collection(collectionName).doc(entryId)
    : db.collection(collectionName).doc();
  const existing = entryId ? await ref.get() : null;
  const previousData = existing?.exists ? existing.data() || {} : {};

  const nextData = {
    ...previousData,
    ...normalized,
    structureId,
    anagraficaId,
    createdAt: previousData.createdAt || new Date().toISOString(),
    createdBy: previousData.createdBy || userUid,
    updatedAt: new Date().toISOString(),
    updatedBy: userUid,
  };

  await ref.set(nextData, { merge: true });
  await replaceAssessmentEvaluationRows({
    anagraficaId,
    entry: nextData,
    entryId: ref.id,
    source:
      collectionName === COLLECTIONS.selfAssessments
        ? "autovalutazione"
        : "monitoraggio",
    structureId,
  });

  return {
    success: true,
    entry: serializeFirestoreData({ id: ref.id, ...nextData }),
  };
}

export async function listSelfAssessments(structureId, anagraficaId) {
  return await listAssessmentEntries(
    COLLECTIONS.selfAssessments,
    structureId,
    anagraficaId,
  );
}

export async function createSelfAssessmentEntry(
  structureId,
  anagraficaId,
  payload,
) {
  const result = await saveAssessmentEntry(
    COLLECTIONS.selfAssessments,
    structureId,
    anagraficaId,
    payload,
  );
  revalidateGroupHomePaths(
    structureId,
    anagraficaId,
    `/${structureId}/anagrafica/${anagraficaId}/autovalutazione`,
  );
  return result;
}

export async function updateSelfAssessmentEntry(
  structureId,
  anagraficaId,
  entryId,
  payload,
) {
  const result = await saveAssessmentEntry(
    COLLECTIONS.selfAssessments,
    structureId,
    anagraficaId,
    payload,
    entryId,
  );
  revalidateGroupHomePaths(
    structureId,
    anagraficaId,
    `/${structureId}/anagrafica/${anagraficaId}/autovalutazione`,
  );
  return result;
}

export async function listIndividualMonitorings(structureId, anagraficaId) {
  return await listAssessmentEntries(
    COLLECTIONS.individualMonitorings,
    structureId,
    anagraficaId,
  );
}

export async function createIndividualMonitoringEntry(
  structureId,
  anagraficaId,
  payload,
) {
  const result = await saveAssessmentEntry(
    COLLECTIONS.individualMonitorings,
    structureId,
    anagraficaId,
    payload,
  );
  revalidateGroupHomePaths(
    structureId,
    anagraficaId,
    `/${structureId}/anagrafica/${anagraficaId}/monitoraggio`,
  );
  return result;
}

export async function updateIndividualMonitoringEntry(
  structureId,
  anagraficaId,
  entryId,
  payload,
) {
  const result = await saveAssessmentEntry(
    COLLECTIONS.individualMonitorings,
    structureId,
    anagraficaId,
    payload,
    entryId,
  );
  revalidateGroupHomePaths(
    structureId,
    anagraficaId,
    `/${structureId}/anagrafica/${anagraficaId}/monitoraggio`,
  );
  return result;
}

export async function listGroupActivities(structureId) {
  await ensureStructureAccess(structureId);
  const snapshot = await db
    .collection(COLLECTIONS.groupActivities)
    .where("structureId", "==", structureId)
    .get();

  return sortByDateDesc(
    snapshot.docs.map((doc) => serializeDoc(doc)),
    "happenedAt",
  );
}

async function saveGroupActivity(structureId, payload, entryId = null) {
  const userUid = await ensureStructureAccess(structureId);
  const residents = await getStructureResidentsInternal(structureId);
  const normalized = normalizeGroupActivityInput(payload, residents);
  const ref = entryId
    ? db.collection(COLLECTIONS.groupActivities).doc(entryId)
    : db.collection(COLLECTIONS.groupActivities).doc();
  const existing = entryId ? await ref.get() : null;
  const previousData = existing?.exists ? existing.data() || {} : {};

  const nextData = {
    ...previousData,
    ...normalized,
    structureId,
    createdAt: previousData.createdAt || new Date().toISOString(),
    createdBy: previousData.createdBy || userUid,
    updatedAt: new Date().toISOString(),
    updatedBy: userUid,
  };

  await ref.set(nextData, { merge: true });
  await replaceGroupActivityEvaluationRows({
    entry: nextData,
    entryId: ref.id,
    structureId,
  });
  return {
    success: true,
    entry: serializeFirestoreData({ id: ref.id, ...nextData }),
  };
}

export async function createGroupActivityEntry(structureId, payload) {
  const result = await saveGroupActivity(structureId, payload);
  revalidateGroupHomePaths(structureId);
  return result;
}

export async function updateGroupActivityEntry(structureId, entryId, payload) {
  const result = await saveGroupActivity(structureId, payload, entryId);
  revalidateGroupHomePaths(structureId);
  return result;
}

export async function listGroupEvaluations(structureId) {
  await ensureStructureAccess(structureId);
  const snapshot = await db
    .collection(COLLECTIONS.groupEvaluations)
    .where("structureId", "==", structureId)
    .get();

  return sortByDateDesc(
    snapshot.docs.map((doc) => serializeDoc(doc)),
    "evaluatedAt",
  );
}

async function saveGroupEvaluation(structureId, payload, entryId = null) {
  const userUid = await ensureStructureAccess(structureId);
  const normalized = normalizeGroupEvaluationInput(payload);
  const ref = entryId
    ? db.collection(COLLECTIONS.groupEvaluations).doc(entryId)
    : db.collection(COLLECTIONS.groupEvaluations).doc();
  const existing = entryId ? await ref.get() : null;
  const previousData = existing?.exists ? existing.data() || {} : {};

  const nextData = {
    ...previousData,
    ...normalized,
    structureId,
    createdAt: previousData.createdAt || new Date().toISOString(),
    createdBy: previousData.createdBy || userUid,
    updatedAt: new Date().toISOString(),
    updatedBy: userUid,
  };

  await ref.set(nextData, { merge: true });
  await replaceGroupEvaluationRows({
    entry: nextData,
    entryId: ref.id,
    structureId,
  });
  return {
    success: true,
    entry: serializeFirestoreData({ id: ref.id, ...nextData }),
  };
}

export async function createGroupEvaluationEntry(structureId, payload) {
  const result = await saveGroupEvaluation(structureId, payload);
  revalidateGroupHomePaths(structureId);
  return result;
}

export async function updateGroupEvaluationEntry(
  structureId,
  entryId,
  payload,
) {
  const result = await saveGroupEvaluation(structureId, payload, entryId);
  revalidateGroupHomePaths(structureId);
  return result;
}

export async function listPattiAccoglienza(structureId, anagraficaId) {
  await ensureAnagraficaAccess(structureId, anagraficaId);
  const snapshot = await db
    .collection(COLLECTIONS.pattiAccoglienza)
    .where("anagraficaId", "==", anagraficaId)
    .get();

  return sortByDateDesc(
    snapshot.docs
      .map((doc) => serializeDoc(doc))
      .filter((entry) => entry.structureId === structureId),
    "startDate",
  );
}

async function savePatto(structureId, anagraficaId, payload, entryId = null) {
  const { userUid } = await ensureAnagraficaAccess(structureId, anagraficaId);
  const normalized = normalizePattoInput(payload);
  const ref = entryId
    ? db.collection(COLLECTIONS.pattiAccoglienza).doc(entryId)
    : db.collection(COLLECTIONS.pattiAccoglienza).doc();
  const existing = entryId ? await ref.get() : null;
  const previousData = existing?.exists ? existing.data() || {} : {};

  const nextData = {
    ...previousData,
    ...normalized,
    structureId,
    anagraficaId,
    createdAt: previousData.createdAt || new Date().toISOString(),
    createdBy: previousData.createdBy || userUid,
    updatedAt: new Date().toISOString(),
    updatedBy: userUid,
  };

  await ref.set(nextData, { merge: true });
  await replaceInterventionEvaluationRows({
    anagraficaId,
    entry: nextData,
    entryId: ref.id,
    structureId,
  });

  return {
    success: true,
    entry: serializeFirestoreData({ id: ref.id, ...nextData }),
  };
}

export async function createPattoEntry(structureId, anagraficaId, payload) {
  const result = await savePatto(structureId, anagraficaId, payload);
  revalidateGroupHomePaths(
    structureId,
    anagraficaId,
    `/${structureId}/anagrafica/${anagraficaId}/patto`,
  );
  return result;
}

export async function updatePattoEntry(
  structureId,
  anagraficaId,
  entryId,
  payload,
) {
  const result = await savePatto(structureId, anagraficaId, payload, entryId);
  revalidateGroupHomePaths(
    structureId,
    anagraficaId,
    `/${structureId}/anagrafica/${anagraficaId}/patto`,
  );
  return result;
}

export async function listInterventions(structureId, anagraficaId) {
  await ensureAnagraficaAccess(structureId, anagraficaId);
  const snapshot = await db
    .collection(COLLECTIONS.interventions)
    .where("anagraficaId", "==", anagraficaId)
    .get();

  return sortByDateDesc(
    snapshot.docs
      .map((doc) => serializeDoc(doc))
      .filter((entry) => entry.structureId === structureId),
    "happenedAt",
  );
}

async function saveIntervention(
  structureId,
  anagraficaId,
  payload,
  entryId = null,
) {
  const { userUid } = await ensureAnagraficaAccess(structureId, anagraficaId);
  const normalized = normalizeInterventionInput(payload);
  const ref = entryId
    ? db.collection(COLLECTIONS.interventions).doc(entryId)
    : db.collection(COLLECTIONS.interventions).doc();
  const existing = entryId ? await ref.get() : null;
  const previousData = existing?.exists ? existing.data() || {} : {};

  const nextData = {
    ...previousData,
    ...normalized,
    structureId,
    anagraficaId,
    createdAt: previousData.createdAt || new Date().toISOString(),
    createdBy: previousData.createdBy || userUid,
    updatedAt: new Date().toISOString(),
    updatedBy: userUid,
  };

  await ref.set(nextData, { merge: true });

  return {
    success: true,
    entry: serializeFirestoreData({ id: ref.id, ...nextData }),
  };
}

export async function createInterventionEntry(
  structureId,
  anagraficaId,
  payload,
) {
  const result = await saveIntervention(structureId, anagraficaId, payload);
  revalidateGroupHomePaths(
    structureId,
    anagraficaId,
    `/${structureId}/anagrafica/${anagraficaId}/interventi`,
  );
  return result;
}

export async function updateInterventionEntry(
  structureId,
  anagraficaId,
  entryId,
  payload,
) {
  const result = await saveIntervention(
    structureId,
    anagraficaId,
    payload,
    entryId,
  );
  revalidateGroupHomePaths(
    structureId,
    anagraficaId,
    `/${structureId}/anagrafica/${anagraficaId}/interventi`,
  );
  return result;
}

export async function getHouseHomeData(structureId) {
  await ensureStructureAccess(structureId);
  const [residents, groupActivities, groupEvaluations] = await Promise.all([
    getStructureResidentsInternal(structureId),
    listGroupActivities(structureId),
    listGroupEvaluations(structureId),
  ]);

  return {
    groupActivities,
    groupEvaluations,
    residents,
  };
}
