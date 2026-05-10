# Documenti Utente, Schede, Percorsi Di Accesso E Blocchi Logici

**Progetto:** GPC Progetto Casa  
**Creato:** 2026-05-10  
**Ambito:** implementazione attuale in `gpc-progetto-casa`, verificata rispetto ai documenti sorgente in `doc in revisione/` e al codice Next.js/Firebase implementato.

Questo documento spiega dove vengono registrate le informazioni dell'utente/ospite, quale scheda o documento UI le contiene, come un operatore le raggiunge e quale logica backend le salva o le deriva.

## Documenti Sorgente Esaminati

Il repository contiene i documenti sorgente di Progetto Casa in `doc in revisione/`:

| Documento sorgente | Area implementata |
| --- | --- |
| `00_YAK_INDICE_ITEM_GESTIONALE.docx` | Catalogo item YAK in `src/lib/group-home/catalog.js` |
| `01_1_CASA_SCHEDA_CASA.docx` | `Scheda Casa`, route `/{structureId}/scheda-casa` |
| `01_2_CASA_ANALISI_APP.docx` | Note di architettura app/dati, soprattutto reporting YAK |
| `02_1_OSPITE_PATTO_ACCOGLIENZA.docx` | `Patto di Accoglienza`, route `/{structureId}/anagrafica/{id}/patto` |
| `02_2_OSPITE_AUTOVALUTAZIONE.docx` | `Autovalutazione`, route `/{structureId}/anagrafica/{id}/autovalutazione` |
| `02_3_OSPITE_MONITORAGGIO.docx` | `Monitoraggio Individuale`, route `/{structureId}/anagrafica/{id}/monitoraggio` |
| `02_4_OSPITE_PROGETTO_PERSONALIZZATO.docx` | `Progetto Personalizzato`, route `/{structureId}/anagrafica/{id}/progetto-personalizzato` |
| `02_5_OSPITE_SCHEDA_INTERVENTO.docx` | `Diario Interventi`, route `/{structureId}/anagrafica/{id}/interventi` |
| `03_1_GRUPPO_DIARIO_GRUPPO.docx` | `Attività di gruppo`, integrata in `/{structureId}` |
| `03_2_GRUPPO_LINEE_GUIDA_REGOLAMENTO_GRUPPO.docx` | Presente parzialmente come impegni/regole statiche; non esiste ancora una scheda o pagina modificabile dedicata |
| `Struttura doc _ Gestionale.docx` | Riferimento alla struttura documentale complessiva |

## Come Gli Operatori Accedono Alle Aree Principali

| Area | Percorso di accesso | Componente/azione principale |
| --- | --- | --- |
| Home struttura / Casa | Sidebar `Casa` oppure `/{structureId}` | `src/app/(portal)/[structureId]/page.jsx`, `HouseHomeClient` |
| Lista anagrafica | Sidebar `Anagrafica` oppure `/{structureId}/anagrafica` | `AnagraficaTable` |
| Nuovo ospite casa | `/{structureId}/new` | `new/page.jsx`, `createRegistrationDraft` |
| Scheda dettaglio ospite | Dalla tabella anagrafica oppure `/{structureId}/anagrafica/{id}` | `anagrafica/[id]/page.js` |
| File ospite | Dettaglio ospite `Opzioni` -> `File e documenti` | `anagrafica/[id]/files/page.js` |
| Documenti casa | Sidebar `Documenti Casa` oppure `/{structureId}/documenti` | `documenti/page.js` |
| Patto, progetto, monitoraggio, interventi | Bottoni `Percorso persona` nel dettaglio ospite oppure pulsante azione mobile | Pagine group-home sotto `anagrafica/[id]/...` |
| Promemoria, accessi, PDF, condivisione | Popover `Opzioni` nel dettaglio ospite | `AnagraficaOptionsMenu` |
| Schede admin struttura | Blocco admin in sidebar, visibile agli admin struttura | `/{structureId}/admin/...` |

## Mappa Di Schede E Documenti

### 1. Nuovo Accesso Casa / Anagrafica

**Accesso:** `/{structureId}/new`  
**Dati principali:** `anagrafica/{anagraficaId}` più `anagrafica_data/{anagraficaId}__{structureId}`  
**File principali:** `src/app/(portal)/[structureId]/new/page.jsx`, `src/features/anagrafica/form/*`, `src/actions/anagrafica/*`

| Scheda UI | Informazioni registrate | Salvato in |
| --- | --- | --- |
| `Informazioni Anagrafiche` / dati personali | cognome, nome, sesso, data di nascita, luogo di nascita, cittadinanza, comune di domicilio, telefono, email | `anagrafica.anagrafica` |
| `Nucleo Familiare` | persona singola/famiglia, tipologia nucleo, numero figli minori | `anagrafica_data.nucleoFamiliare` |
| `Situazione Legale e Abitativa` | situazione legale, array situazione abitativa | `anagrafica_data.legaleAbitativa` |
| `Lavoro e Formazione` | situazione lavorativa, titolo di studio nel paese di origine, titolo di studio in Italia, livello italiano | `anagrafica_data.lavoroFormazione` |
| `Vulnerabilità e Prospettive` | vulnerabilità selezionate, intenzione di fermarsi in Italia, paese di destinazione | `anagrafica_data.vulnerabilita` |
| `Come ci ha conosciuto` | fonte referral e testo referral personalizzato | `anagrafica_data.referral` |
| `Contesto Casa` | operatore di riferimento, stanza/spazio assegnato, data ingresso, data uscita, note percorso | `anagrafica_data.contestoCasa` |
| `Privacy` / completamento registrazione | informativa cartacea raccolta, data firma, riferimento, note, metadati file firmato | `anagrafica.privacy` |
| `Note Operatori` | note interne visibili agli operatori autorizzati | `anagrafica.internalNotes` |

La creazione verifica che siano presenti operatore di riferimento e data di ingresso prima del salvataggio. Il server separa i dati identitari globali dai dati specifici della struttura e impedisce il collegamento automatico se esiste già una scheda attiva con lo stesso codice fiscale fuori dalla struttura corrente.

### 2. Scheda Persona

**Accesso:** `/{structureId}/anagrafica/{id}`  
**Dati principali:** lettura unificata da `anagrafica` e da `anagrafica_data` della struttura corrente  
**File principale:** `src/app/(portal)/[structureId]/anagrafica/[id]/page.js`

| Scheda/sezione | Informazioni mostrate o modificate |
| --- | --- |
| `Informazioni Anagrafiche` | dati identitari globali: nome, sesso, data/luogo di nascita, cittadinanza, domicilio, telefono, email |
| `Note Operatori` | modifica/salvataggio note interne tramite `updateAnagrafica` |
| Accordion `Altre Informazioni` | famiglia, legale/abitativo, lavoro/formazione, vulnerabilità, referral, contesto casa, metadati registrazione/privacy |
| `Promemoria` | promemoria futuri/passati collegati alla persona ed eventualmente a un accesso/file |
| `Accessi` | servizi registrati per la persona, con tipo, sottocategorie, classificazione, ente referral, note, file, data, promemoria, operatore |
| `Storico` | storico unificato di modifiche anagrafica, accessi, promemoria e file |
| Bottoni `Percorso persona` | Patto, Progetto Personalizzato, Autovalutazione, Monitoraggio, Diario Interventi |
| Menu `Opzioni` | modifica scheda, browser file, completamento registrazione se pendente, promemoria, PDF, registrazione accesso, condivisione |

### 3. File E Documenti - Persona

**Accesso:** `/{structureId}/anagrafica/{id}/files` tramite `Opzioni` -> `File e documenti`  
**Collection:** `files`, `folders`  
**Storage path:** `files/{anagraficaId}/...`  
**File principali:** `src/app/(portal)/[structureId]/anagrafica/[id]/files/page.js`, `src/actions/files/files.js`, `src/actions/files/folders.js`

I metadati file registrati includono nome visualizzato, nome file originale, tipo MIME, dimensione, percorso storage, ID anagrafica, ID accesso opzionale, categoria, tag, data scadenza, campi di accesso struttura, metadati uploader, campi soft-delete, ultimo accesso e conteggio accessi.

Le cartelle sono gerarchiche. Le cartelle di categoria predefinite derivano dalle categorie storiche: `DOCUMENT`, `IDENTITY`, `LEGAL`, `MEDICAL`, `EMPLOYMENT`, `EDUCATION`, `HOUSING`, `FINANCIAL`, `OTHER`.

### 4. Documenti Casa - Struttura

**Accesso:** sidebar `Documenti Casa`, route `/{structureId}/documenti`  
**Collection:** `structureFiles`, `structureFolders`  
**Storage path:** `structure-files/{structureId}/...`  
**File principali:** `src/app/(portal)/[structureId]/documenti/page.js`, `src/actions/files/structure-files.js`, `src/actions/files/structure-folders.js`

Questa area conserva documenti di casa/struttura non collegati a un singolo ospite. Supporta creazione cartelle, upload, spostamento, eliminazione, refresh, vista griglia/lista e download tramite URL firmati.

### 5. Scheda Casa

**Accesso:** bottone `Scheda casa` nella home struttura oppure `/{structureId}/scheda-casa`  
**Collection/documento:** `house_profiles/{structureId}`  
**File principali:** `src/app/(portal)/[structureId]/scheda-casa/page.jsx`, `HouseProfileManager`, `upsertHouseProfile`

| Scheda | Informazioni registrate |
| --- | --- |
| `Dati dell'abitazione` | indirizzo, nome operatore, data compilazione, residenti attivi |
| `Contratto di abitazione` | tipologia contratto, proprietario, intestatari affitto/subaffitto, data inizio/fine, cauzione, affitto mensile, metodo pagamento, giorno scadenza, scadenze importanti |
| `Sicurezza e utenze` | interruttore elettrico, valvola gas, valvola acqua, contatori acqua/luce/gas, intestatari/fornitori/codici cliente/POD/PDR/numero servizio, TARI, internet/telefono, chi riceve/paga le bollette |
| `Spese ed elettrodomestici` | spese condominiali, spese straordinarie, fondo cassa, elettrodomestici, proprietà elettrodomestici, presenza/funzionamento, note |
| `Manutenzione e spazi comuni` | tecnici e contatti caldaia/condizionatore, prossimo intervento, contatti utili, contatto emergenze, spazi comuni, orari silenzio, calendario rifiuti, regole pulizie, note finali |

Al salvataggio, l'app aggiorna anche gli ID dei residenti correnti partendo dalle anagrafiche attive accessibili dalla struttura.

### 6. Patto Di Accoglienza

**Accesso:** dettaglio ospite `Patto di Accoglienza`, route `/{structureId}/anagrafica/{id}/patto`  
**Collection:** `patti_accoglienza`  
**File principali:** `PattoAccoglienzaManager`, `createPattoEntry`, `updatePattoEntry`

| Sezione | Informazioni registrate |
| --- | --- |
| `0 - Prerequisiti per l'accoglienza` | accetta patto, accetta regolamento, possiede documenti, possiede entrate |
| `1 - Dati delle parti` | nome/contatti persona, nome/contatti servizio, operatore, casa di destinazione, date inizio/fine |
| `2 - Quota e modalità di pagamento` | quota mensile richiesta/concordata, giorno scadenza pagamento, metodo pagamento, metodo personalizzato |
| `3 - Impegni nella convivenza` | note sugli impegni di convivenza |
| `4 - Relazione con vicinato` | note sul vicinato |
| `5 - Cura degli spazi` | note sulla cura degli spazi |
| `6 - Impegni del servizio` | impegni statici del servizio mostrati nel form |
| `7 - Firma del patto` | nomi firma persona/operatore e date firma |

Il Patto viene salvato solo come documento sorgente. Attualmente non crea righe di valutazione YAK.

### 7. Progetto Personalizzato

**Accesso:** dettaglio ospite `Progetto Personalizzato`, route `/{structureId}/anagrafica/{id}/progetto-personalizzato`  
**Documento principale:** `personal_projects/{structureId}__{anagraficaId}`  
**Collection derivata:** `objectives`  
**File principali:** `PersonalProjectManager`, `upsertPersonalProject`, `replaceObjectiveRows`

| Scheda | Informazioni registrate |
| --- | --- |
| `Dati identificativi` | nome ospite, operatore, data compilazione, data revisione prevista |
| `Parte 1 - Osservazioni condivise` | osservazioni per area: `PER`, `ABI`, `ECO`, `REL` |
| `Come mi sento` | punti di forza, difficoltà, aspirazioni |
| `Documenti e dati essenziali` | documenti in possesso, lingua madre, altre lingue, tipi di entrata, entrata mensile media |
| `Parte 2 - Azioni condivise` | obiettivi per area, ID item YAK collegati, tempi, indicatori di risultato, altri obiettivi |
| `Condivisione e firma` | nomi firma ospite/operatore, data condivisione, prossima revisione |

Il salvataggio del progetto riscrive le righe derivate in `objectives`, una per obiettivo. Queste righe supportano il reporting per obiettivi in base a struttura, persona, stato, area e item YAK collegati.

### 8. Autovalutazione

**Accesso:** dettaglio ospite `Autovalutazione`, route `/{structureId}/anagrafica/{id}/autovalutazione`  
**Collection:** `self_assessments`  
**Collection derivata:** `yak_evaluations` con source `autovalutazione`  
**File principali:** `AssessmentEntryManager`, `createSelfAssessmentEntry`, `updateSelfAssessmentEntry`

| Scheda | Informazioni registrate |
| --- | --- |
| Header/metadati | operatore, servizio, numero progressivo, data compilazione, data revisione, data precedente/data riferimento, note generali |
| `Dati essenziali` | documenti in possesso, lingua madre, altre lingue, tipi di entrata, entrata mensile media |
| `Uno sguardo d'insieme` | in cosa la persona si sente capace, cosa vuole migliorare, per cosa chiede aiuto |
| `Osservazioni qualitative` | campi qualitativi condivisi con il monitoraggio |
| `Valutazione sintetica e prossimi passi` | stato, motivazione, prossime azioni, scadenze, item YAK collegati, campi condivisione/firma |
| Schede area: `PER`, `ABI`, `ECO`, `REL` | un valore/nota per item YAK, con scala persona `0`, `1`, `2`, `3`, `N/A` |

Al salvataggio, l'app elimina le precedenti righe `yak_evaluations` per la stessa entry sorgente e ricrea una riga per ogni item YAK compilato.

### 9. Monitoraggio Individuale

**Accesso:** dettaglio ospite `Monitoraggio Individuale`, route `/{structureId}/anagrafica/{id}/monitoraggio`  
**Collection:** `individual_monitorings`  
**Collection derivata:** `yak_evaluations` con source `monitoraggio`  
**File principali:** `AssessmentEntryManager`, `createIndividualMonitoringEntry`, `updateIndividualMonitoringEntry`

Il Monitoraggio usa lo stesso manager dell'Autovalutazione, con etichette rivolte all'operatore e scala di monitoraggio. Salva gli stessi metadati, dati essenziali, panoramica, note qualitative, valutazione sintetica, prossime azioni, firme e risposte agli item `PER/ABI/ECO/REL`.

### 10. Diario Interventi

**Accesso:** dettaglio ospite `Diario Interventi`, route `/{structureId}/anagrafica/{id}/interventi`  
**Collection:** `interventions`  
**Collection derivata:** `yak_evaluations` con source `intervento`  
**File principali:** `InterventionManager`, `createInterventionEntry`, `updateInterventionEntry`

Le informazioni registrate includono data intervento, ora inizio, durata, numero progressivo, operatore, tipo intervento, luogo, persone presenti, fino a 3 item YAK toccati con valore/nota, obiettivi collegati, diario/narrazione, prossimi passi per persona e operatore, note equipe e prossimo appuntamento.

### 11. Attività Di Gruppo

**Accesso:** home struttura `Nuova attività di gruppo` oppure sezione collassabile `Attività di gruppo` in `/{structureId}`  
**Collection:** `group_activities`  
**Collection derivata:** `yak_evaluations` con source `attivita_gruppo` e `attivita_gruppo_individuale`  
**File principali:** `HouseHomeClient`, `GroupActivitiesManager`, `createGroupActivityEntry`, `updateGroupActivityEntry`

Le informazioni registrate includono data/ora, numero progressivo, operatore, luogo, tipologia attività, partecipanti, descrizione attività, risposte GRP di gruppo, item YAK individuali toccati per i partecipanti, note educatore, prossimi impegni del gruppo, prossimi impegni dell'operatore e data prossima attività.

### 12. Valutazioni Di Gruppo

**Accesso:** home struttura `Nuova valutazione di gruppo` oppure sezione collassabile `Valutazioni di gruppo` in `/{structureId}`  
**Collection:** `group_evaluations`  
**Collection derivata:** `yak_evaluations` con source `valutazione_gruppo` e `autovalutazione_gruppo`  
**File principali:** `HouseHomeClient`, `GroupEvaluationsManager`, `createGroupEvaluationEntry`, `updateGroupEvaluationEntry`

Le informazioni registrate includono data valutazione, operatore/educatore, etichetta periodo, data follow-up, risposte GRP dell'operatore, risposte di autovalutazione del gruppo, andamento generale, punti di forza, criticità, valutazione sintetica e azioni concordate.

### 13. Accessi

**Accesso:** dettaglio ospite `Opzioni` -> `Registra accesso`; la lista appare in `Visualizza / Nascondi Accessi`  
**Collection:** `accessi`; i file caricati creano anche righe in `files`  
**File principali:** `AccessDialog`, `AccessServicesForm`, `src/actions/anagrafica/access.js`

Gli Accessi registrano il lavoro orientato ai servizi fuori dai documenti sorgente YAK di Progetto Casa. I dati salvati per servizio includono tipo servizio, sottocategorie, classificazione, ente referral, note, file, data promemoria, operatore e metadati di creazione.

Le categorie servizio attuali includono legale, lavoro, abitare, educativo/formativo, sanitario, amministrativo/fiscale e sociale/segretariato.

### 14. Promemoria

**Accesso:** dettaglio ospite `Opzioni` -> `Nuovo promemoria`; visibile nella scheda `Promemoria`  
**Collection:** `reminders`  
**File principali:** `ReminderDialog`, `AnagraficaReminders`, `src/actions/anagrafica/reminders.js`

I Promemoria salvano data/ora, tipo servizio, ente referral, nota, eventuale accesso collegato, eventuale file e metadati operatore. La UI separa prossimi e passati ed evidenzia urgenze di oggi/domani/entro 7 giorni.

## Catalogo Item YAK E Punteggi

Gli ID item YAK sono centralizzati in `src/lib/group-home/catalog.js`.

| Area | Significato | Range item |
| --- | --- | --- |
| `PER` | cura personale, salute, lingua, benessere emotivo, motivazione | `PER-01` a `PER-09` |
| `ABI` | autonomia abitativa, spazi condivisi, elettrodomestici, pasti, rifiuti, convivenza | `ABI-01` a `ABI-07` |
| `ECO` | denaro, bollette, documenti, lavoro, puntualità, competenze | `ECO-01` a `ECO-07` |
| `REL` | relazioni in casa, operatori, rete esterna, mobilità, servizi, territorio | `REL-01` a `REL-06` |
| `GRP` | collaborazione di gruppo, ascolto, conflitto, regole, appartenenza | `GRP-01` a `GRP-05` |

I valori di valutazione sono normalizzati in `yak_evaluations` come numero da `0` a `3`, con `isNotApplicable: true` e `value: null` per `N/A`.

## Blocchi Logici

### Autenticazione E Autorizzazione

- `src/middleware.js` verifica le sessioni e invia l'identità negli header della richiesta.
- `requireUser()` legge `x-user-uid` lato server.
- `verifyUserPermissions()` controlla super admin, accesso progetto, accesso struttura o intersezione con strutture consentite.
- `requireAnagraficaAccess()` verifica esistenza scheda, soft delete, strutture consentite e scope struttura opzionale.
- Le regole client Firestore permettono solo letture limitate del contesto operatore/progetto/struttura; tutte le altre operazioni dati passano da server actions con Admin SDK.
- Le regole Storage negano lettura/scrittura client diretta; i file sono accessibili tramite URL firmati generati da server actions.

### Modello Dati Anagrafica Separato

- I dati identitari globali vivono in `anagrafica`.
- I dati situazionali specifici della struttura vivono in `anagrafica_data`.
- L'ID documento canonico dei dati struttura è `{anagraficaId}__{structureId}`.
- Le letture uniscono dati globali e dati struttura per la struttura corrente.
- Gli aggiornamenti indirizzano i gruppi di campi alla collection corretta e creano entry di storico.

### Documenti Sorgente Progetto Casa

- I form sorgente vengono mantenuti come documenti completi: `house_profiles`, `patti_accoglienza`, `personal_projects`, `self_assessments`, `individual_monitorings`, `interventions`, `group_activities`, `group_evaluations`.
- La normalizzazione input avviene in `src/actions/group-home.js` prima della scrittura.
- Create/update usano guard di documento con scope quando modificano entry esistenti.
- `revalidateGroupHomePaths()` aggiorna le pagine coinvolte dopo le scritture.

### Flussi Derivati Di Reporting

- `yak_evaluations` è il flusso long-format per l'analisi a livello item.
- In aggiornamento, le righe dello stesso `sourceEntryId` vengono eliminate e ricostruite.
- `objectives` viene ricostruito da `personal_projects.goalsByArea`.
- Gli helper di monitoring evidence leggono `yak_evaluations` e producono ultimo valore, traiettoria, conteggio tocchi e dati sugli item silenti.

### Gestione File E Cartelle

- File persona: `files` e `folders`.
- File struttura: `structureFiles` e `structureFolders`.
- Gli upload validano dimensione/tipo file, scrivono metadati in Firestore e il binario in Cloud Storage.
- I download usano URL firmati generati lato server.
- Le operazioni sulle cartelle usano controlli permessi struttura/anagrafica e semantica soft-delete.

### Storico, Audit E Cache

- Le modifiche anagrafica vengono scritte nello storico.
- Accessi, promemoria e file vengono uniti nella timeline visibile.
- Le utility di audit tracciano operazioni create/read/update/delete/accesso file.
- I cache tag in `src/lib/cache.js` invalidano anagrafica, accessi, file, cartelle, file struttura, utenti e statistiche quando necessario.

## Errori E Riscontri

### Risultati Tooling

Comandi eseguiti il 2026-05-10:

| Comando | Risultato |
| --- | --- |
| `npm run build` | Superato. Next.js ha compilato correttamente e generato tutte le route elencate. |
| `npm run lint` | Fallito. Biome ha riportato 10 errori e 2 warning. |

### Errori Biome Da Correggere

| File | Riscontro |
| --- | --- |
| `src/app/(portal)/[structureId]/anagrafica/[id]/files/page.js` | `rootFolders` è dichiarata ma non usata. |
| `src/app/(portal)/[structureId]/anagrafica/[id]/files/page.js` | Gli import non sono ordinati e il formatter modificherebbe l'import da lucide. |
| `src/app/(portal)/[structureId]/anagrafica/[id]/files/page.js` | Tre elementi nativi `<button>` non hanno `type="button"` esplicito. |
| `src/components/Files/FileList/MobileFileList.jsx` | L'import `cn` non è usato. |
| `src/components/Files/FileList/MobileFileList.jsx` | Due map per skeleton usano l'indice array come key. |
| `src/components/Files/FileList/MobileFileList.jsx` | Il formatter riorganizzerebbe diverse righe JSX lunghe. |
| `src/components/Files/Breadcrumbs/FolderBreadcrumbs.jsx` | Gli import non sono ordinati. |
| `src/components/Files/Breadcrumbs/FolderBreadcrumbs.jsx` | La lista dipendenze di `useEffect` include `breadcrumbs`, che Biome segnala come non necessaria. |

I fallimenti lint sono concentrati nel browser file mobile e nei breadcrumb. Attualmente non bloccano `next build`, ma vanno corretti prima di una CI pulita o di un passaggio di formattazione.

### Gap Di Prodotto / Documentazione

| Area | Gap |
| --- | --- |
| `03_2_GRUPPO_LINEE_GUIDA_REGOLAMENTO_GRUPPO.docx` | Non è stata trovata una route o collection modificabile dedicata. Alcune regole/impegni compaiono in Patto e Scheda Casa, ma il documento non è rappresentato come scheda autonoma. |
| `docs/YAK_FIRESTORE_ARCHITECTURE.md` | La sezione `Current App Alignment` è parzialmente non aggiornata. Il codice ora scrive righe YAK dagli interventi, non scrive righe YAK dal Patto, crea `objectives` e salva valori YAK numerici con `isNotApplicable`. |
| `residencies` | Il documento architetturale raccomanda una collection storica delle residenze, ma l'implementazione conserva ancora soprattutto lo stato corrente in `anagrafica_data.contestoCasa`. Gli spostamenti tra case non sono ancora record storici di primo livello. |
| Persistenza catalogo YAK | Il catalogo YAK è hard-coded in `catalog.js`; non esiste ancora un mirror Firestore `yak_item_catalog`. Va bene nel breve periodo, ma limita reporting/versioning esterni. |
| Stato worktree | Il repository contiene molte modifiche e nuovi file. Considerare lo stato corrente come un branch di lavoro attivo prima di commit o deploy. |

## Flusso Operativo Rapido

1. Selezionare la casa/struttura dallo structure switcher.
2. Aprire `Anagrafica` per cercare o creare un ospite.
3. Usare `Nuovo Accesso Casa` per registrare la persona e il contesto casa.
4. Aprire la scheda dettaglio ospite per dati profilo, file, promemoria, accessi e azioni PDF/condivisione.
5. Usare `Percorso persona` per Patto, Progetto Personalizzato, Autovalutazione, Monitoraggio e Diario Interventi.
6. Usare la pagina `Casa` per Scheda Casa, Attività di Gruppo e Valutazioni di Gruppo.
7. Usare `Documenti Casa` per i file della casa, non collegati a un ospite specifico.
