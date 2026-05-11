"use client";

import {
  differenceInDays,
  format,
  isPast,
  isToday,
  isTomorrow,
} from "date-fns";
import { it } from "date-fns/locale";
import {
  Bell,
  CalendarClock,
  ExternalLink,
  FileText,
  History,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAnagraficaRemindersAction } from "@/actions/anagrafica/reminders";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Per-type visual schemes: accent color, date block, badge
const TYPE_SCHEMES = {
  Legale: {
    accent: "bg-blue-500",
    dateBg: "bg-blue-50",
    dateText: "text-blue-700",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  Lavoro: {
    accent: "bg-orange-500",
    dateBg: "bg-orange-50",
    dateText: "text-orange-700",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
  },
  Abitare: {
    accent: "bg-emerald-500",
    dateBg: "bg-emerald-50",
    dateText: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  "Educativo/Formativo": {
    accent: "bg-purple-500",
    dateBg: "bg-purple-50",
    dateText: "text-purple-700",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  Sanitario: {
    accent: "bg-red-500",
    dateBg: "bg-red-50",
    dateText: "text-red-700",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  "Amministrativo/Fiscale": {
    accent: "bg-amber-500",
    dateBg: "bg-amber-50",
    dateText: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "Segretariato Sociale": {
    accent: "bg-teal-500",
    dateBg: "bg-teal-50",
    dateText: "text-teal-700",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
  },
  default: {
    accent: "bg-muted-foreground/50",
    dateBg: "bg-muted",
    dateText: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
  },
};

function urgencyPill(date) {
  if (isToday(date))
    return {
      text: "Oggi",
      className: "bg-red-100 text-red-700 border border-red-200",
    };
  if (isTomorrow(date))
    return {
      text: "Domani",
      className: "bg-orange-100 text-orange-700 border border-orange-200",
    };
  const days = differenceInDays(date, new Date());
  if (days > 0 && days <= 7)
    return {
      text: `${days}gg`,
      className: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    };
  return null;
}

function ReminderItem({ reminder, structureId, muted = false }) {
  const date = new Date(reminder.date);
  const scheme = TYPE_SCHEMES[reminder.serviceType] ?? TYPE_SCHEMES.default;
  const urgency = !muted ? urgencyPill(date) : null;
  const timeStr =
    format(date, "HH:mm") !== "00:00" ? format(date, "HH:mm") : null;

  return (
    <div
      className={cn(
        "flex rounded-md border overflow-hidden mb-2 transition-all hover:shadow-sm",
        isToday(date) && "ring-1 ring-red-300",
        muted && "opacity-55",
      )}
    >
      {/* Left accent bar */}
      <div className={cn("w-1 flex-shrink-0", scheme.accent)} />

      {/* Calendar date block */}
      <div
        className={cn(
          "flex flex-col items-center justify-center px-3 py-2.5 border-r min-w-[52px]",
          scheme.dateBg,
        )}
      >
        <span
          className={cn(
            "text-2xl font-bold leading-none tabular-nums",
            scheme.dateText,
          )}
        >
          {format(date, "d")}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
          {format(date, "MMM", { locale: it })}
        </span>
        {timeStr && (
          <span className="text-[9px] text-muted-foreground mt-1 font-mono">
            {timeStr}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 px-3 py-2.5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                scheme.badge,
              )}
            >
              {reminder.serviceType || "—"}
            </span>
            {reminder.linkedToAccess && (
              <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 border">
                da accesso
              </span>
            )}
          </div>

          {/* Urgency pill */}
          {urgency && (
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0",
                urgency.className,
              )}
            >
              {urgency.text}
            </span>
          )}
        </div>

        {reminder.enteRiferimento && (
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">
            {reminder.enteRiferimento}
          </p>
        )}

        {reminder.note && (
          <p className="text-xs text-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">
            {reminder.note}
          </p>
        )}

        {(reminder.file || (reminder.accessId && structureId)) && (
          <div className="flex items-center gap-3 mt-2">
            {reminder.file && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <FileText className="w-3 h-3" />
                {reminder.file.nomeOriginale || reminder.file.nome}
              </span>
            )}
            {reminder.accessId && structureId && (
              <a
                href={`/${structureId}/anagrafica/${reminder.anagraficaId}/accessi/${reminder.accessId}`}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                Vai all&apos;accesso
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonItem() {
  return (
    <div className="flex rounded-md border overflow-hidden mb-2 animate-pulse">
      <div className="w-1 flex-shrink-0 bg-border" />
      <div className="flex flex-col items-center justify-center px-3 py-2.5 border-r min-w-[52px] bg-muted gap-1">
        <div className="h-6 w-6 rounded bg-border" />
        <div className="h-2 w-8 rounded bg-border" />
      </div>
      <div className="flex-1 px-3 py-3 space-y-2">
        <div className="h-3 w-24 rounded-full bg-border" />
        <div className="h-2.5 w-3/4 rounded bg-muted" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-10 text-muted-foreground">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-5 h-5 opacity-50" />
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function AnagraficaReminders({ anagraficaId, structureId }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!anagraficaId) return;
    getAnagraficaRemindersAction(anagraficaId)
      .then((raw) => {
        const parsed = JSON.parse(raw);
        setReminders(parsed.reminders || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [anagraficaId]);

  const upcoming = reminders.filter(
    (r) => !isPast(new Date(r.date)) || isToday(new Date(r.date)),
  );
  const past = reminders.filter(
    (r) => isPast(new Date(r.date)) && !isToday(new Date(r.date)),
  );

  const urgentCount = upcoming.filter((r) => {
    const d = new Date(r.date);
    return isToday(d) || isTomorrow(d) || differenceInDays(d, new Date()) <= 7;
  }).length;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="w-5 h-5" />
          Promemoria
          <div className="flex items-center gap-1.5 ml-1">
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="text-xs font-semibold">
                {upcoming.length}
              </Badge>
            )}
            {urgentCount > 0 && (
              <Badge className="text-xs bg-red-100 text-red-700 border border-red-200 hover:bg-red-100">
                {urgentCount} urgente{urgentCount !== 1 ? "i" : ""}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {error && (
          <p className="text-sm text-destructive py-4 text-center">
            Errore: {error}
          </p>
        )}

        <Tabs defaultValue="upcoming">
          <TabsList className="mb-4 h-8">
            <TabsTrigger
              value="upcoming"
              className="flex items-center gap-1.5 text-xs h-7"
            >
              <Bell className="w-3 h-3" />
              Prossimi
              {upcoming.length > 0 && (
                <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 leading-none font-semibold">
                  {upcoming.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="flex items-center gap-1.5 text-xs h-7"
            >
              <History className="w-3 h-3" />
              Passati
              {past.length > 0 && (
                <span className="ml-0.5 rounded-full bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 leading-none">
                  {past.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {loading ? (
              <>
                <SkeletonItem />
                <SkeletonItem />
              </>
            ) : upcoming.length === 0 ? (
              <EmptyState icon={Bell} message="Nessun promemoria in arrivo" />
            ) : (
              upcoming.map((r) => (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  structureId={structureId}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past">
            {loading ? (
              <>
                <SkeletonItem />
                <SkeletonItem />
              </>
            ) : past.length === 0 ? (
              <EmptyState icon={History} message="Nessun promemoria passato" />
            ) : (
              [...past]
                .reverse()
                .map((r) => (
                  <ReminderItem
                    key={r.id}
                    reminder={r}
                    structureId={structureId}
                    muted
                  />
                ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
