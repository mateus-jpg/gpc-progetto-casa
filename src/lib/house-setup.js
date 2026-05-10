export const HOUSE_TYPE_OPTIONS = [
  "Casa popolare",
  "Affitto privato",
  "Co-abitazione",
  "Progetto dedicato",
  "Altro",
];

export const COHABITATION_TYPE_OPTIONS = ["Singola", "Condivisa", "Mista"];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumberOrEmpty(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

function normalizeBooleanOrNull(value) {
  if (value === true || value === false) {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

export function createEmptyHouseSetup() {
  return {
    administrativeReferent: "",
    authorizedResidents: "",
    cohabitationCriticalities: "",
    cohabitationType: "",
    domicileAllowed: null,
    hasCondominiumRules: null,
    hasManagingEntity: null,
    hospitalityAllowed: null,
    houseType: "",
    houseTypeOther: "",
    legalOperatorAllowed: null,
    managingEntityName: "",
    maxGuests: "",
    propertyOwner: "",
    referenceNotes: "",
    rentContractHolder: "",
    residencyAllowed: null,
    technicalReferent: "",
  };
}

export function normalizeHouseSetupInput(input = {}) {
  return {
    ...createEmptyHouseSetup(),
    administrativeReferent: normalizeString(input.administrativeReferent),
    authorizedResidents: normalizeNumberOrEmpty(input.authorizedResidents),
    cohabitationCriticalities: normalizeString(input.cohabitationCriticalities),
    cohabitationType: normalizeString(input.cohabitationType),
    domicileAllowed: normalizeBooleanOrNull(input.domicileAllowed),
    hasCondominiumRules: normalizeBooleanOrNull(input.hasCondominiumRules),
    hasManagingEntity: normalizeBooleanOrNull(input.hasManagingEntity),
    hospitalityAllowed: normalizeBooleanOrNull(input.hospitalityAllowed),
    houseType: normalizeString(input.houseType),
    houseTypeOther: normalizeString(input.houseTypeOther),
    legalOperatorAllowed: normalizeBooleanOrNull(input.legalOperatorAllowed),
    managingEntityName: normalizeString(input.managingEntityName),
    maxGuests: normalizeNumberOrEmpty(input.maxGuests),
    propertyOwner: normalizeString(input.propertyOwner),
    referenceNotes: normalizeString(input.referenceNotes),
    rentContractHolder: normalizeString(input.rentContractHolder),
    residencyAllowed: normalizeBooleanOrNull(input.residencyAllowed),
    technicalReferent: normalizeString(input.technicalReferent),
  };
}
