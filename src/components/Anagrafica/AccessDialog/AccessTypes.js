// Default access types - used as fallback when structure has no custom categories
export const AccessTypes = [
  {
    value: "legale",
    label: "Legale",
    subCategories: [
      "Informativa legale generica",
      "Accesso procedura protezione internazionale",
      "Regolamento di Dublino",
      "Richiesta/rinnovo/conversione permesso di soggiorno",
      "Ricongiungimento familiare",
      "Coesione familiare",
      "Possibilità ricorso",
      "Richiesta inserimento in CAS/SAI",
      "Richiesta/rinnovo titolo di viaggio",
      "Richiesta/rinnovo passaporto",
      "Richiesta PdS lungo periodo",
      "Sanatoria",
      "Decreto flussi",
      "Tipologie di visti",
      "Orientamento su normativa extra immigrazione - Lavoro",
      "Orientamento su normativa extra immigrazione - Penale",
      "Orientamento su normativa extra immigrazione - Famiglia/multe/sfratti",
      "Richiesta cittadinanza",
      "Informativa anti-tratta",
      "Informativa sfruttamento lavorativo",
      "Altro",
    ],
  },
  {
    value: "lavoro",
    label: "Lavoro",
    subCategories: [
      "Orientamento generico al lavoro",
      "Check delle competenze",
      "Creazione CV",
      "Aggiornamento CV",
      "Iscrizione CPI",
      "DID Online",
      "Attivazione borse/tirocini",
      "Mediazione con agenzia/SAL/azienda",
      "Iscrizione a bandi/concorsi",
      "Ricerca attiva del lavoro",
      "Lettura contratto e busta paga",
      "Orientamento diritti dei lavoratori",
      "Segnalazione SUAM/COL/Agenzie lavoro (CC Roma)",
      "Altro",
    ],
  },
  {
    value: "abitare",
    label: "Abitare",
    subCategories: [
      "Orientamento alla residenza fittizia e all'iscrizione anagrafica",
      "Orientamento ai servizi di bassa soglia",
      "Orientamento alle strutture temporanee",
      "Orientamento alla locazione",
      "Orientamento accoglienza in famiglia",
      "Iscrizione a Lo.C.A.Re",
      "Segnalazione Ufficio Stranieri",
      "Segnalazione Servizi Sociali territoriali",
      "Segnalazione Sportello Federconsumatori",
      "Intermediazione agenzie immobiliari",
      "Redazione del bilancio familiare",
      "Lettura contratto e bollette",
      "Compilazione modulistica per bandi",
      "Segnalazione al SUAM",
      "Segnalazione Unità di Strada",
      "Orientamento a sistema di accoglienza istituzionale",
      "Orientamento su procedura di sfratto",
      "Altro",
    ],
  },
  {
    value: "educativo",
    label: "Educativo/Formativo",
    subCategories: [
      "Iscrizione CPIA",
      "Iscrizione scuola primaria/istituti superiori/università",
      "Orientamento corsi di formazione professionale",
      "Riconoscimento titoli",
      "Counseling carriera formativa",
      "Corsi di lingua",
      "Progetti socio-culturali",
      "Attività ricreative/laboratori",
      "Volontariato",
      "Altro",
    ],
  },
  {
    value: "sanitario",
    label: "Sanitario",
    subCategories: [
      "Orientamento sanitario generico",
      "Richiesta assegnazione medico di base",
      "Cambio medico di base",
      "Orientamento verso i servizi sociali",
      "Orientamento verso i servizi di supporto psicologico",
      "Orientamento a centri di etnopsichiatria",
      "Prenotazione esami e visite",
      "Ritiro referti",
      "Ottenimento codice STP",
      "Orientamento verso i consultori",
      "Orientamento SerT",
      "Altro",
    ],
  },
  {
    value: "amministrativo",
    label: "Amministrativo/Fiscale",
    subCategories: [
      "Questioni relative a Agenzia delle entrate",
      "Questioni relative a INPS",
      "Questioni relative al Comune",
      "Questioni relative a SPID",
      "Questioni relative a conto bancario o postale",
      "Altro",
    ],
  },
  {
    value: "sociale",
    label: "Segretariato Sociale",
    subCategories: ["Questioni relative a Ufficio anagrafe", "Altro"],
  },
];

/*
Presa in carico (il bisogno dell'utente è soddisfatto attraverso presa in carico specifica da parte di un operatore del CC) 
Informativa (il bisogno dell'utente è soddisfatto fornendo informazioni e/o orientamento generale) 
Supporto indiretto / Referral verso altri servizi (l'utente viene inviato verso uno specifico servizio del territorio adatto a rispondere al suo bisogno) 

*/
export const AccessClassifications = [
  "Presa in carico (il bisogno dell'utente è soddisfatto attraverso presa in carico specifica da parte di un operatore del CC)",
  "Informativa (il bisogno dell'utente è soddisfatto fornendo informazioni e/o orientamento generale)",
  "Supporto indiretto / Referral verso altri servizi (l'utente viene inviato verso uno specifico servizio del territorio adatto a rispondere al suo bisogno)",
];

// Alias for clarity when used as default fallback
export const DefaultAccessTypes = AccessTypes;
