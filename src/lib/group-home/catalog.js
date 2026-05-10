export const GROUP_HOME_AREAS = [
  {
    id: "PER",
    emoji: "🧍",
    label: "Area Personale",
    shortLabel: "Personale",
    description: "Cura di sé, salute, lingua italiana, benessere emotivo",
  },
  {
    id: "ABI",
    emoji: "🏠",
    label: "Area Abitativa",
    shortLabel: "Abitativa",
    description: "Spazi, convivenza, gestione della casa",
  },
  {
    id: "ECO",
    emoji: "💶",
    label: "Area Economica / Lavorativa",
    shortLabel: "Economica / Lavorativa",
    description: "Denaro, documenti, lavoro",
  },
  {
    id: "REL",
    emoji: "🌍",
    label: "Area Relazioni e Territorio",
    shortLabel: "Relazioni e Territorio",
    description: "Rete sociale, mobilità, servizi, partecipazione",
  },
];

export const GROUP_HOME_AREA_MAP = Object.fromEntries(
  GROUP_HOME_AREAS.map((area) => [area.id, area]),
);

export const ASSESSMENT_ITEMS = [
  {
    id: "PER-01",
    areaId: "PER",
    operatorLabel: "Igiene personale",
    personLabel: "Mi prendo cura del mio corpo e mi vesto in modo adeguato",
    description: "Cura del corpo, abbigliamento adeguato",
  },
  {
    id: "PER-02",
    areaId: "PER",
    operatorLabel: "Gestione salute",
    personLabel:
      "So prendere i miei farmaci, andare dal medico, prenotare visite",
    description: "Farmaci, visite, consapevolezza sanitaria",
  },
  {
    id: "PER-03",
    areaId: "PER",
    operatorLabel: "Organizzazione della giornata",
    personLabel:
      "Riesco a organizzare la mia giornata e a rispettare gli impegni",
    description: "Rispetto di routine e impegni",
  },
  {
    id: "PER-04",
    areaId: "PER",
    operatorLabel: "Autonomia decisionale",
    personLabel: "Riesco a prendere decisioni sulle cose che mi riguardano",
    description: "Capacità di scegliere in modo adeguato",
  },
  {
    id: "PER-05",
    areaId: "PER",
    operatorLabel: "Comprensione italiano",
    personLabel: "Capisco quando qualcuno mi parla o quando leggo un avviso",
    description: "Capisce discorsi, avvisi e moduli",
  },
  {
    id: "PER-06",
    areaId: "PER",
    operatorLabel: "Espressione in italiano",
    personLabel:
      "Riesco a chiedere informazioni, a dire cosa sento, a scrivere messaggi",
    description: "Chiede, esprime bisogni, scrive messaggi",
  },
  {
    id: "PER-07",
    areaId: "PER",
    operatorLabel: "Stabilità emotiva",
    personLabel: "In casa e con le persone intorno mi sento bene",
    description: "Umore e regolazione",
  },
  {
    id: "PER-08",
    areaId: "PER",
    operatorLabel: "Gestione dello stress",
    personLabel:
      "Quando ho un problema, riesco a gestirlo senza stare troppo male",
    description: "Reazioni alle difficoltà",
  },
  {
    id: "PER-09",
    areaId: "PER",
    operatorLabel: "Motivazione al progetto",
    personLabel:
      "Mi sento coinvolto/a nel progetto che stiamo costruendo insieme",
    description: "Partecipazione e coinvolgimento",
  },
  {
    id: "ABI-01",
    areaId: "ABI",
    operatorLabel: "Cura degli spazi personali",
    personLabel: "Tengo pulita e in ordine la mia stanza",
    description: "Pulizia e ordine della propria stanza",
  },
  {
    id: "ABI-02",
    areaId: "ABI",
    operatorLabel: "Cura degli spazi comuni",
    personLabel: "Aiuto a tenere puliti il bagno, la cucina e gli spazi comuni",
    description: "Pulizia di bagno, cucina, aree condivise",
  },
  {
    id: "ABI-03",
    areaId: "ABI",
    operatorLabel: "Uso degli elettrodomestici",
    personLabel: "Uso lavatrice, forno e fornelli in modo corretto e sicuro",
    description: "Lavatrice, forno, fornelli — uso sicuro",
  },
  {
    id: "ABI-04",
    areaId: "ABI",
    operatorLabel: "Gestione pasti",
    personLabel: "Riesco a organizzarmi con la spesa e a preparare i pasti",
    description: "Preparazione e organizzazione del cibo",
  },
  {
    id: "ABI-05",
    areaId: "ABI",
    operatorLabel: "Raccolta differenziata",
    personLabel: "Faccio la raccolta differenziata come si deve",
    description: "Conoscenza e applicazione",
  },
  {
    id: "ABI-06",
    areaId: "ABI",
    operatorLabel: "Gestione convivenza",
    personLabel: "Rispetto le regole di casa, i turni e gli spazi degli altri",
    description: "Rispetto di regole, turni, spazi dell'altro",
  },
  {
    id: "ABI-07",
    areaId: "ABI",
    operatorLabel: "Segnalazione guasti e manutenzione",
    personLabel: "Se qualcosa si rompe in casa, so a chi dirlo",
    description: "Sa riconoscere e segnalare un problema",
  },
  {
    id: "ECO-01",
    areaId: "ECO",
    operatorLabel: "Gestione del denaro",
    personLabel: "So gestire i miei soldi e riesco a risparmiare qualcosa",
    description: "Spese, risparmio, consapevolezza economica",
  },
  {
    id: "ECO-02",
    areaId: "ECO",
    operatorLabel: "Pagamento affitto e bollette",
    personLabel: "Pago affitto e bollette nei tempi giusti",
    description: "Rispetto scadenze, modalità di pagamento",
  },
  {
    id: "ECO-03",
    areaId: "ECO",
    operatorLabel: "Comprensione bolletta/busta paga",
    personLabel: "Riesco a capire una bolletta o una busta paga",
    description: "Legge un documento economico",
  },
  {
    id: "ECO-04",
    areaId: "ECO",
    operatorLabel: "Tenuta documenti personali",
    personLabel: "Tengo in ordine i miei documenti",
    description: "Ordine di documenti identità, sanitari, economici",
  },
  {
    id: "ECO-05",
    areaId: "ECO",
    operatorLabel: "Situazione lavorativa",
    personLabel: "Come mi sento con il lavoro (o con la ricerca di lavoro)",
    description: "Presenza, ricerca, tenuta del lavoro",
  },
  {
    id: "ECO-06",
    areaId: "ECO",
    operatorLabel: "Puntualità e responsabilità lavorativa",
    personLabel: "Sono puntuale e rispetto gli impegni di lavoro",
    description: "Rispetto di orari e impegni sul lavoro",
  },
  {
    id: "ECO-07",
    areaId: "ECO",
    operatorLabel: "Competenze professionali",
    personLabel: "Sto imparando o mantenendo le mie competenze di lavoro",
    description: "Sviluppo o mantenimento delle competenze",
  },
  {
    id: "REL-01",
    areaId: "REL",
    operatorLabel: "Relazioni con coinquilini",
    personLabel: "Come vanno i rapporti con chi vive con me",
    description: "Qualità delle interazioni in casa",
  },
  {
    id: "REL-02",
    areaId: "REL",
    operatorLabel: "Relazione con operatori",
    personLabel: "Come mi sento con gli operatori",
    description: "Collaborazione e fiducia",
  },
  {
    id: "REL-03",
    areaId: "REL",
    operatorLabel: "Rete sociale esterna",
    personLabel: "Ho amici, familiari o persone su cui contare fuori casa",
    description: "Amici, famiglia, contatti",
  },
  {
    id: "REL-04",
    areaId: "REL",
    operatorLabel: "Mobilità e orientamento",
    personLabel: "So muovermi nel quartiere e usare i mezzi pubblici",
    description: "Uso mezzi pubblici, orientamento nel quartiere",
  },
  {
    id: "REL-05",
    areaId: "REL",
    operatorLabel: "Uso dei servizi del territorio",
    personLabel:
      "So fare la spesa, andare dal medico, usare gli sportelli del territorio",
    description: "Spesa, medico, sportelli, servizi",
  },
  {
    id: "REL-06",
    areaId: "REL",
    operatorLabel: "Partecipazione al territorio",
    personLabel: "Partecipo a qualche attività nel quartiere o in città",
    description: "Attività, associazioni, iniziative",
  },
];

export const ASSESSMENT_ITEMS_BY_AREA = GROUP_HOME_AREAS.map((area) => ({
  ...area,
  items: ASSESSMENT_ITEMS.filter((item) => item.areaId === area.id),
}));

export const ASSESSMENT_ITEM_MAP = Object.fromEntries(
  ASSESSMENT_ITEMS.map((item) => [item.id, item]),
);

export const SELF_ASSESSMENT_SCALE = [
  { value: "0", emoji: "☹️", label: "Non lo so fare" },
  { value: "1", emoji: "😐", label: "Mi serve aiuto" },
  { value: "2", emoji: "🙂", label: "Quasi da solo" },
  { value: "3", emoji: "😊", label: "Da solo" },
  { value: "na", emoji: "—", label: "N/A" },
];

export const MONITORING_SCALE = [
  { value: "0", label: "0 · Non autonomo" },
  { value: "1", label: "1 · Supporto frequente" },
  { value: "2", label: "2 · Supporto occasionale" },
  { value: "3", label: "3 · Autonomo" },
  { value: "na", label: "N/A" },
];

export const DOCUMENT_OPTIONS = [
  "Carta d'identità",
  "Tessera sanitaria",
  "Permesso di soggiorno",
  "Altro",
];

export const INCOME_OPTIONS = [
  "Stipendio",
  "Pensione",
  "Sussidi / contributi",
  "Nessuna entrata stabile",
];

export const CONTRACT_TYPE_OPTIONS = [
  "Affitto",
  "Sub-affitto",
  "Comodato",
  "Proprietà",
  "Altro",
];

export const PAYMENT_METHOD_OPTIONS = ["Bonifico", "Contanti", "Altro"];

export const BILL_CONTACT_OPTIONS = ["Abitante", "Operatore", "Altro"];

export const TARI_PAYMENT_OPTIONS = ["Annuale", "Rate"];

export const APPLIANCE_DEFAULTS = [
  "Frigorifero",
  "Forno",
  "Piano cottura",
  "Lavatrice",
  "Lavastoviglie",
  "Caldaia / Boiler",
  "Altro",
];

export const COMMON_SPACE_OPTIONS = [
  "Scale",
  "Cortile",
  "Ascensore",
  "Cantina",
  "Altro",
];

export const GROUP_ACTIVITY_TYPE_OPTIONS = [
  "Assemblea di Casa",
  "Cerchio di Parola / Focus Group",
  "Laboratorio di Autonomia",
  "Uscita sul Territorio",
  "Cena di Condivisione",
  "Altro",
];

export const GROUP_ACTIVITY_LOCATION_OPTIONS = [
  "Casa/Appartamento",
  "Territorio",
  "Altro",
];

export const GRP_ITEMS = [
  {
    id: "GRP-01",
    label: "Collaborazione su obiettivi comuni",
    groupQuestion: "Riusciamo a metterci d'accordo e a fare le cose insieme",
    description:
      "Capacità del gruppo di condividere compiti, organizzare turni, raggiungere risultati cooperativi",
  },
  {
    id: "GRP-02",
    label: "Espressione e ascolto",
    groupQuestion: "Riusciamo a parlare e ad ascoltarci a vicenda",
    description:
      "Capacità di esprimere il proprio punto di vista e di ascoltare quello degli altri",
  },
  {
    id: "GRP-03",
    label: "Gestione dei conflitti",
    groupQuestion:
      "Quando c'è un problema, riusciamo a parlarne e a trovare soluzioni",
    description: "Modalità con cui il gruppo affronta tensioni e disaccordi",
  },
  {
    id: "GRP-04",
    label: "Rispetto delle regole condivise",
    groupQuestion: "Rispettiamo le regole della casa",
    description:
      "Aderenza del gruppo come collettivo alle regole della casa (turni, orari, spazi)",
  },
  {
    id: "GRP-05",
    label: "Senso di appartenenza alla casa",
    groupQuestion: "Ci sentiamo bene insieme in questa casa",
    description:
      "Percezione del gruppo come 'noi' — clima affettivo, cura reciproca, attenzione al benessere altrui",
  },
];

export const GRP_ITEM_MAP = Object.fromEntries(
  GRP_ITEMS.map((item) => [item.id, item]),
);

export const GRP_SCALE = [
  { value: "0", label: "0 · Frammentato" },
  { value: "1", label: "1 · Fragile" },
  { value: "2", label: "2 · In costruzione" },
  { value: "3", label: "3 · Coeso" },
  { value: "na", label: "N/A" },
];

export function createEmptyGrpResponses() {
  return Object.fromEntries(
    GRP_ITEMS.map((item) => [item.id, { value: "", note: "" }]),
  );
}

export const GROUP_COLLABORATION_OPTIONS = ["Alta", "Media", "Bassa"];

export const GROUP_CONFLICT_OPTIONS = [
  "Costruttiva",
  "Difficoltosa",
  "Assente",
];

export const GROUP_RULE_OPTIONS = [
  "Tutti hanno rispettato il regolamento",
  "Qualche criticità",
];

export const INTERVENTION_TYPE_OPTIONS = [
  "A casa",
  "Fuori casa",
  "Colloquio formale",
  "Accompagnamento",
  "Emergenza",
  "Altro",
];

export const INTERVENTION_LOCATION_OPTIONS = [
  "Casa",
  "Fuori casa",
  "Servizio / ufficio",
  "Territorio",
  "Altro",
];

export const INTERVENTION_WHO_OPTIONS = [
  "Operatrice da sola",
  "Con collega",
  "Con familiari",
  "Con servizi",
  "Altro",
];

export function createEmptyAssessmentResponses() {
  return Object.fromEntries(
    ASSESSMENT_ITEMS.map((item) => [item.id, { value: "", note: "" }]),
  );
}

export function createEmptyGoal() {
  return {
    goal: "",
    linkedItemIds: [],
    timeframe: "",
    successIndicators: "",
  };
}

export function createEmptyGoalsByArea() {
  return Object.fromEntries(
    GROUP_HOME_AREAS.map((area) => [area.id, [createEmptyGoal()]]),
  );
}

export function createDefaultAppliances() {
  return APPLIANCE_DEFAULTS.map((name) => ({
    name,
    present: false,
    functioning: false,
    ownership: "",
    notes: "",
  }));
}
