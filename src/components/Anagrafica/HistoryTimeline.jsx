"use client";

import {
  IconAlertTriangle,
  IconBell,
  IconBriefcase,
  IconBuilding,
  IconCalendarEvent,
  IconChevronDown,
  IconChevronRight,
  IconFileText,
  IconHistory,
  IconPencil,
  IconUser,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAnagraficaActivityTimeline } from "@/actions/anagrafica/history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const GROUP_LABELS = {
  anagrafica: "Dati Personali",
  privacy: "Privacy e Informativa",
  nucleoFamiliare: "Nucleo Familiare",
  legaleAbitativa: "Situazione Legale e Abitativa",
  lavoroFormazione: "Lavoro e Formazione",
  vulnerabilita: "Vulnerabilita",
  referral: "Referral",
  contestoCasa: "Contesto Casa",
  services: "Servizi accesso",
};

const FIELD_LABELS = {
  nome: "Nome",
  cognome: "Cognome",
  sesso: "Sesso",
  dataDiNascita: "Data di Nascita",
  luogoDiNascita: "Luogo di Nascita",
  cittadinanza: "Cittadinanza",
  comuneDiDomicilio: "Comune di Domicilio",
  telefono: "Telefono",
  email: "Email",
  nucleo: "Tipo Nucleo",
  nucleoTipo: "Composizione Nucleo",
  figli: "Numero Figli",
  situazioneLegale: "Situazione Legale",
  situazioneAbitativa: "Situazione Abitativa",
  situazioneLavorativa: "Situazione Lavorativa",
  titoloDiStudioOrigine: "Titolo di Studio (Origine)",
  titoloDiStudioItalia: "Titolo di Studio (Italia)",
  conoscenzaItaliano: "Conoscenza Italiano",
  vulnerabilita: "Vulnerabilita",
  intenzioneItalia: "Intenzione Italia",
  paeseDestinazione: "Paese di Destinazione",
  referral: "Referral",
  referralAltro: "Referral (Altro)",
  operatoreRiferimentoNome: "Operatore di riferimento",
  operatoreRiferimentoUid: "UID operatore di riferimento",
  figureOperative: "Figure operative",
  dataIngresso: "Data ingresso",
  dataUscita: "Data uscita",
  spazioAssegnato: "Stanza o spazio assegnato",
  notePercorsoCasa: "Note percorso casa",
  paperNoticeCollected: "Informativa cartacea raccolta",
  paperNoticeSignedAt: "Data firma informativa",
  paperNoticeReference: "Riferimento documento",
  paperNoticeNotes: "Note privacy",
  paperNoticeFileId: "Documento firmato",
  paperNoticeFileName: "Nome documento firmato",
  paperNoticeUploadedAt: "Data caricamento documento firmato",
};

const FILTERS = [
  { value: "all", label: "Tutto" },
  { value: "agenda", label: "Agenda" },
  { value: "accesses", label: "Accessi" },
  { value: "files", label: "File" },
  { value: "changes", label: "Modifiche" },
];

const ACTIVITY_META = {
  anagrafica_history: {
    label: "Scheda",
    icon: IconPencil,
    className: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  },
  access_created: {
    label: "Accesso",
    icon: IconBriefcase,
    className: "bg-violet-500/10 text-violet-700 border-violet-200",
  },
  access_history: {
    label: "Accesso",
    icon: IconHistory,
    className: "bg-violet-500/10 text-violet-700 border-violet-200",
  },
  reminder_due: {
    label: "Promemoria",
    icon: IconBell,
    className: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
  file_uploaded: {
    label: "File",
    icon: IconFileText,
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
  file_expiry: {
    label: "Scadenza",
    icon: IconAlertTriangle,
    className: "bg-rose-500/10 text-rose-700 border-rose-200",
  },
};

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatValue(value) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value.trim())
  ) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, "dd/MM/yyyy", { locale: it });
    }
  }
  if (typeof value === "object") {
    if (value.seconds || value._seconds) {
      const timestamp = value.seconds || value._seconds;
      return format(new Date(timestamp * 1000), "dd/MM/yyyy", { locale: it });
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function formatDate(dateValue) {
  const date = parseDate(dateValue);
  if (!date) return "-";
  return format(date, "dd MMM yyyy 'alle' HH:mm", { locale: it });
}

function daysFromToday(value) {
  const date = parseDate(value);
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function dueLabel(value) {
  const days = daysFromToday(value);
  if (days === null) return null;
  if (days === 0) return "Oggi";
  if (days === 1) return "Domani";
  if (days > 1) return `Tra ${days} gg`;
  if (days === -1) return "Ieri";
  return `${Math.abs(days)} gg fa`;
}

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (value === "" || value === 0) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function activityMatchesFilter(activity, filter) {
  if (filter === "all") return true;
  if (filter === "agenda") {
    return ["reminder_due", "file_expiry"].includes(activity.kind);
  }
  if (filter === "accesses") return activity.kind.startsWith("access");
  if (filter === "files") return activity.kind.startsWith("file");
  if (filter === "changes") return activity.kind.includes("history");
  return true;
}

function getActivityHref(activity, structureId, anagraficaId) {
  if (!structureId || !anagraficaId) return null;

  if (activity.accessId) {
    return `/${structureId}/anagrafica/${anagraficaId}/accessi/${activity.accessId}`;
  }

  if (activity.kind.startsWith("file")) {
    return `/${structureId}/anagrafica/${anagraficaId}/files`;
  }

  return `/${structureId}/anagrafica/${anagraficaId}`;
}

export function HistoryTimeline({ anagraficaId, structureId = null }) {
  const [activities, setActivities] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    async function loadTimeline() {
      setLoading(true);
      setError(null);

      try {
        const result = await getAnagraficaActivityTimeline(
          anagraficaId,
          structureId,
          90,
        );
        const data = JSON.parse(result);

        if (!data.success) {
          throw new Error(data.error || "Errore durante il caricamento");
        }

        setActivities(data.activities || []);
        setCounts(data.counts || null);
      } catch (err) {
        console.error("Error loading activity timeline:", err);
        setError("Errore durante il caricamento della timeline");
      } finally {
        setLoading(false);
      }
    }

    if (anagraficaId) {
      loadTimeline();
    }
  }, [anagraficaId, structureId]);

  const filterCounts = useMemo(() => {
    return FILTERS.reduce((acc, filter) => {
      acc[filter.value] = activities.filter((activity) =>
        activityMatchesFilter(activity, filter.value),
      ).length;
      return acc;
    }, {});
  }, [activities]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconHistory className="h-5 w-5" />
            Timeline della scheda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconHistory className="h-5 w-5" />
            Timeline della scheda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconHistory className="h-5 w-5" />
              Timeline della scheda
            </CardTitle>
            <CardDescription className="mt-1">
              Modifiche, accessi, promemoria e documenti nello stesso flusso
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{counts?.total || 0} attivita</Badge>
            {counts?.upcoming ? (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                {counts.upcoming} in arrivo
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2 sm:grid-cols-5">
            {FILTERS.map((filter) => (
              <TabsTrigger
                key={filter.value}
                value={filter.value}
                className="gap-2"
              >
                <span>{filter.label}</span>
                <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {filterCounts[filter.value] || 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {FILTERS.map((filter) => (
            <TabsContent
              key={filter.value}
              value={filter.value}
              className="m-0"
            >
              <TimelineList
                activities={activities.filter((activity) =>
                  activityMatchesFilter(activity, filter.value),
                )}
                anagraficaId={anagraficaId}
                structureId={structureId}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TimelineList({ activities, anagraficaId, structureId }) {
  if (!activities.length) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Nessuna attivita per questo filtro
      </div>
    );
  }

  return (
    <div>
      {activities.map((activity, index) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          anagraficaId={anagraficaId}
          structureId={structureId}
          isLast={index === activities.length - 1}
        />
      ))}
    </div>
  );
}

function ActivityItem({ activity, anagraficaId, structureId, isLast }) {
  const [isOpen, setIsOpen] = useState(false);
  const meta = ACTIVITY_META[activity.kind] || ACTIVITY_META.anagrafica_history;
  const Icon = meta.icon;
  const href = getActivityHref(activity, structureId, anagraficaId);
  const hasChanges =
    activity.changes && Object.keys(activity.changes).length > 0;
  const label = dueLabel(activity.occurredAt);
  const isFuture =
    ["reminder_due", "file_expiry"].includes(activity.kind) &&
    (daysFromToday(activity.occurredAt) || 0) >= 0;

  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {!isLast ? (
        <div className="absolute left-4 top-9 bottom-0 w-px bg-border" />
      ) : null}
      <div
        className={cn(
          "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background",
          meta.className,
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 rounded-lg border bg-background p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{meta.label}</Badge>
              {activity.status ? (
                <Badge variant="secondary">{activity.status}</Badge>
              ) : null}
              {isFuture && label ? (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  {label}
                </Badge>
              ) : null}
            </div>
            <div>
              <h4 className="font-medium leading-snug">{activity.title}</h4>
              {activity.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {activity.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <IconCalendarEvent className="size-3.5" />
                {formatDate(activity.occurredAt)}
              </span>
              {activity.actor ? (
                <span className="flex items-center gap-1">
                  <IconUser className="size-3.5" />
                  {activity.actor}
                </span>
              ) : null}
              {activity.structureId ? (
                <span className="flex items-center gap-1">
                  <IconBuilding className="size-3.5" />
                  {activity.structureId}
                </span>
              ) : null}
            </div>
          </div>
          {href ? (
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href={href}>
                Apri
                <IconChevronRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>

        {hasChanges ? (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted/40"
              >
                <span>Dettagli modifica</span>
                {isOpen ? (
                  <IconChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <IconChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-4">
                {Object.entries(activity.changes).map(
                  ([groupName, { before, after }]) => (
                    <GroupChanges
                      key={groupName}
                      groupName={groupName}
                      before={before}
                      after={after}
                    />
                  ),
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
  );
}

function GroupChanges({ groupName, before, after }) {
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  const changedFields = Array.from(allKeys).filter((key) => {
    const beforeVal = before?.[key];
    const afterVal = after?.[key];

    if (isEmptyValue(beforeVal) && isEmptyValue(afterVal)) return false;

    return JSON.stringify(beforeVal) !== JSON.stringify(afterVal);
  });

  if (changedFields.length === 0) {
    return null;
  }

  return (
    <div>
      <h5 className="mb-2 text-sm font-medium">
        {GROUP_LABELS[groupName] || groupName}
      </h5>
      <div className="space-y-2 rounded-md bg-muted/30 p-3">
        {changedFields.map((field) => (
          <div key={field} className="text-sm">
            <span className="font-medium">{FIELD_LABELS[field] || field}:</span>
            <div className="mt-1 flex flex-wrap gap-2 pl-2">
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800 line-through">
                {formatValue(before?.[field])}
              </span>
              <span className="text-muted-foreground">&gt;</span>
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                {formatValue(after?.[field])}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistoryTimeline;
