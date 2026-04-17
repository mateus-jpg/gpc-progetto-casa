"use client";

import {
  IconChevronDown,
  IconChevronRight,
  IconHistory,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useEffect, useState } from "react";
import { getAccessHistoryAction } from "@/actions/anagrafica/access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { stripHtml } from "@/utils/htmlSanitizer";

function formatValue(value) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    return value
      .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
      .join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ServiceDiff({ before, after }) {
  const beforeServices = before || [];
  const afterServices = after || [];

  return (
    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
      <div>
        <p className="font-medium text-xs text-muted-foreground uppercase mb-2">
          Prima
        </p>
        {beforeServices.length === 0 ? (
          <p className="text-muted-foreground italic text-xs">
            Nessun servizio
          </p>
        ) : (
          beforeServices.map((svc, i) => (
            <div
              key={i}
              className="bg-red-50 border border-red-200 rounded p-2 mb-2"
            >
              <p className="font-medium text-xs">{svc.tipoAccesso || "-"}</p>
              {svc.sottoCategorie?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatValue(svc.sottoCategorie)}
                </p>
              )}
              {svc.note && (
                <p className="text-xs mt-1 line-clamp-2">
                  {stripHtml(svc.note)}
                </p>
              )}
            </div>
          ))
        )}
      </div>
      <div>
        <p className="font-medium text-xs text-muted-foreground uppercase mb-2">
          Dopo
        </p>
        {afterServices.map((svc, i) => (
          <div
            key={i}
            className="bg-green-50 border border-green-200 rounded p-2 mb-2"
          >
            <p className="font-medium text-xs">{svc.tipoAccesso || "-"}</p>
            {svc.sottoCategorie?.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatValue(svc.sottoCategorie)}
              </p>
            )}
            {svc.note && (
              <p className="text-xs mt-1 line-clamp-2">{stripHtml(svc.note)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryEntry({ entry }) {
  const [open, setOpen] = useState(false);
  const date = new Date(entry.changedAt);

  const changeTypeLabel =
    entry.changeType === "create" ? "Creazione" : "Modifica";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-3 py-3 px-4 hover:bg-muted/50 rounded-lg text-left transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <IconHistory className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={
                  entry.changeType === "create" ? "default" : "secondary"
                }
                className="text-xs"
              >
                {changeTypeLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(date, "d MMMM yyyy 'alle' HH:mm", { locale: it })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {entry.changedByMail || entry.changedBy || "Sistema"}
              {entry.changedByStructure && ` · ${entry.changedByStructure}`}
            </p>
          </div>
          {open ? (
            <IconChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <IconChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4">
          {entry.changes?.services && (
            <ServiceDiff
              before={entry.changes.services.before}
              after={entry.changes.services.after}
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AccessHistoryTimeline({ accessId, anagraficaId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accessId || !anagraficaId) return;
    getAccessHistoryAction(accessId, anagraficaId)
      .then((raw) => {
        const parsed = JSON.parse(raw);
        setEntries(parsed.entries || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessId, anagraficaId]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IconHistory className="w-5 h-5" />
          Cronologia Modifiche
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading && (
          <p className="text-sm text-muted-foreground px-4">Caricamento...</p>
        )}
        {error && (
          <p className="text-sm text-destructive px-4">Errore: {error}</p>
        )}
        {!loading && !error && entries.length === 0 && (
          <p className="text-sm text-muted-foreground px-4">
            Nessuna modifica registrata.
          </p>
        )}
        {!loading &&
          entries.map((entry) => <HistoryEntry key={entry.id} entry={entry} />)}
      </CardContent>
    </Card>
  );
}
