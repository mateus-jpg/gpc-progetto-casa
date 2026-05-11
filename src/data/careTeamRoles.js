export const CARE_TEAM_ROLE_OPTIONS = [
  { value: "EDU", label: "Educatore.trice" },
  { value: "AS", label: "Assistente Sociale" },
  { value: "OML", label: "Operatore.trice Mercato del Lavoro" },
  { value: "PSI", label: "Psicologo.a" },
  { value: "MED", label: "Mediatore.trice culturale" },
  { value: "OSS", label: "Operatore.trice socio-sanitario.a" },
  { value: "VOL", label: "Volontario.a" },
  { value: "FAM", label: "Familiare di riferimento" },
];

export const CARE_TEAM_ROLE_CODES = CARE_TEAM_ROLE_OPTIONS.map(
  (option) => option.value,
);

const CARE_TEAM_ROLE_LABELS = CARE_TEAM_ROLE_OPTIONS.reduce(
  (labels, option) => {
    labels[option.value] = option.label;
    return labels;
  },
  {},
);

export function getCareTeamRoleLabel(value) {
  return CARE_TEAM_ROLE_LABELS[value] || value || "";
}
