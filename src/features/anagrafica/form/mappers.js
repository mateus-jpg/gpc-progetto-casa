import { sanitizeVulnerabilities } from "@/utils/vulnerability";
import { createEmptyAnagraficaFormState } from "./defaults";

export function parseMaybeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const timestamp = value.seconds || value._seconds;
  if (typeof timestamp === "number") {
    return new Date(timestamp * 1000);
  }

  return null;
}

export function normalizeReferralPayload(referral = {}) {
  let finalReferral = referral.referral || "";

  if (
    (finalReferral === "Altro" || finalReferral === "Ente partner") &&
    referral.referralAltro?.trim()
  ) {
    finalReferral = referral.referralAltro.trim();
  }

  return {
    referral: finalReferral,
  };
}

export function prepareAnagraficaPayload(formData) {
  return {
    ...formData,
    internalNotes:
      typeof formData.internalNotes === "string"
        ? formData.internalNotes.trim()
        : "",
    vulnerabilita: {
      ...formData.vulnerabilita,
      vulnerabilita: sanitizeVulnerabilities(
        formData.vulnerabilita?.vulnerabilita,
      ),
    },
    referral: normalizeReferralPayload(formData.referral),
  };
}

export function prepareRegistrationDraftPayload(formData, structureId) {
  const payload = prepareAnagraficaPayload(formData);
  delete payload.privacy;

  return {
    ...payload,
    registeredByStructure: structureId,
    canBeAccessedBy: [structureId],
  };
}

export function transformAnagraficaApiToFormState(data) {
  const initialState = createEmptyAnagraficaFormState({
    canBeAccessedBy: data.canBeAccessedBy || [],
  });

  return {
    ...initialState,
    anagrafica: {
      ...initialState.anagrafica,
      ...data.anagrafica,
      dataDiNascita:
        parseMaybeDate(data.anagrafica?.dataDiNascita) || undefined,
    },
    nucleoFamiliare: {
      ...initialState.nucleoFamiliare,
      ...data.nucleoFamiliare,
    },
    legaleAbitativa: {
      ...initialState.legaleAbitativa,
      ...data.legaleAbitativa,
    },
    lavoroFormazione: {
      ...initialState.lavoroFormazione,
      ...data.lavoroFormazione,
    },
    vulnerabilita: {
      ...initialState.vulnerabilita,
      ...data.vulnerabilita,
      vulnerabilita: sanitizeVulnerabilities(data.vulnerabilita?.vulnerabilita),
    },
    referral: {
      ...initialState.referral,
      ...data.referral,
      referralAltro: "",
    },
    contestoCasa: {
      ...initialState.contestoCasa,
      ...data.contestoCasa,
    },
    internalNotes:
      typeof data.internalNotes === "string" ? data.internalNotes : "",
    privacy: {
      ...initialState.privacy,
      ...data.privacy,
      paperNoticeCollected: data.privacy?.paperNoticeCollected === true,
      paperNoticeSignedAt: parseMaybeDate(data.privacy?.paperNoticeSignedAt),
    },
    canBeAccessedBy: data.canBeAccessedBy || initialState.canBeAccessedBy,
  };
}
