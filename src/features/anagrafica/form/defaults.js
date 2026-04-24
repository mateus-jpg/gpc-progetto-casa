export function createEmptyAnagraficaFormState({
  structureId = null,
  canBeAccessedBy,
} = {}) {
  const resolvedAccess =
    canBeAccessedBy !== undefined
      ? canBeAccessedBy
      : structureId
        ? [structureId]
        : [];

  return {
    anagrafica: {
      cognome: "",
      nome: "",
      sesso: "",
      dataDiNascita: undefined,
      luogoDiNascita: "",
      cittadinanza: [],
      comuneDiDomicilio: "",
      telefono: "",
      email: "",
    },
    nucleoFamiliare: {
      nucleo: "singolo",
      nucleoTipo: "",
      figli: 0,
    },
    legaleAbitativa: {
      situazioneLegale: "",
      situazioneAbitativa: [],
    },
    lavoroFormazione: {
      situazioneLavorativa: "",
      titoloDiStudioOrigine: "",
      titoloDiStudioItalia: "",
      conoscenzaItaliano: "",
    },
    vulnerabilita: {
      vulnerabilita: [],
      intenzioneItalia: "",
      paeseDestinazione: "",
    },
    referral: {
      referral: "",
      referralAltro: "",
    },
    internalNotes: "",
    privacy: {
      paperNoticeCollected: false,
      paperNoticeSignedAt: null,
      paperNoticeReference: "",
      paperNoticeNotes: "",
    },
    canBeAccessedBy: Array.isArray(resolvedAccess) ? resolvedAccess : [],
  };
}
