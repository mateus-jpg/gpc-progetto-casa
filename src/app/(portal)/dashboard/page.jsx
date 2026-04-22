"use client";

import {
  IconArrowRight,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconChartBar,
  IconHistory,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useStructuresStatistics } from "@/hooks/use-statistics";

const numberFormatter = new Intl.NumberFormat("it-IT");

function sumValues(map = {}) {
  return Object.values(map || {}).reduce((sum, value) => sum + (value || 0), 0);
}

function topEntry(map = {}) {
  return Object.entries(map || {})
    .map(([name, value]) => ({ name, value: value || 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)[0];
}

function aggregateStats(structures, statsByStructure) {
  return structures.reduce(
    (totals, structure) => {
      const stats = statsByStructure[structure.id] || {};
      totals.people += stats.totalPersons || structure.peopleCount || 0;
      totals.accesses += stats.totalAccesses || 0;
      totals.services += stats.totalServices || sumValues(stats.byAccessType);
      totals.reminders += stats.activeReminders || 0;
      totals.history += stats.totalHistoryEvents || 0;
      totals.staff += structure.staffCount || structure.admins?.length || 0;
      return totals;
    },
    {
      people: 0,
      accesses: 0,
      services: 0,
      reminders: 0,
      history: 0,
      staff: 0,
    },
  );
}

function SummaryCard({ icon: Icon, label, value, detail, isLoading }) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardDescription className="truncate">{label}</CardDescription>
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <CardTitle className="text-3xl font-semibold tabular-nums">
          {isLoading ? <Skeleton className="h-9 w-20" /> : value}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-4 w-36" />
        ) : (
          <p className="text-sm text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StructureCard({ structure, stats, isLoading }) {
  const people = stats?.totalPersons || structure.peopleCount || 0;
  const totalServices = stats?.totalServices || sumValues(stats?.byAccessType);
  const activeReminders = stats?.activeReminders || 0;
  const historyEvents = stats?.totalHistoryEvents || 0;
  const topService = topEntry(stats?.byAccessType);
  const topNeed =
    topEntry(stats?.byLegalStatus) || topEntry(stats?.byVulnerability);
  const serviceIntensity = people ? totalServices / people : 0;

  return (
    <Link href={`/${structure.id}`} className="group block h-full">
      <Card className="h-full rounded-lg transition hover:border-primary/40 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate text-lg">
                {structure.name || structure.id}
              </CardTitle>
              <CardDescription className="mt-1 truncate">
                {topService?.name || "Servizi non ancora classificati"}
              </CardDescription>
            </div>
            <IconArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Persone</p>
              <div className="text-xl font-semibold tabular-nums">
                {isLoading ? <Skeleton className="h-7 w-12" /> : people}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Servizi/persona</p>
              <div className="text-xl font-semibold tabular-nums">
                {isLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  serviceIntensity.toLocaleString("it-IT", {
                    maximumFractionDigits: 1,
                  })
                )}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Promemoria</p>
              <div className="text-xl font-semibold tabular-nums">
                {isLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  activeReminders
                )}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Cambi</p>
              <div className="text-xl font-semibold tabular-nums">
                {isLoading ? <Skeleton className="h-7 w-12" /> : historyEvents}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="max-w-full truncate">
              {structure.staffCount || structure.admins?.length || 0} operatori
            </Badge>
            <Badge variant="outline" className="max-w-full truncate">
              {topNeed?.name || "Bisogni in raccolta"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Page() {
  const { availableStructures, loading } = useAuth();
  const structures = availableStructures || [];
  const structureIds = React.useMemo(
    () => structures.map((structure) => structure.id),
    [structures],
  );
  const { statsByStructure, isLoading: isStatsLoading } =
    useStructuresStatistics(structureIds);
  const totals = React.useMemo(
    () => aggregateStats(structures, statsByStructure),
    [structures, statsByStructure],
  );
  const isLoading = loading || isStatsLoading;

  return (
    <div className="@container/main flex flex-col gap-5 px-4 lg:px-6">
      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-3 @3xl/main:flex-row @3xl/main:items-end @3xl/main:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 gap-1">
              <IconBuildingCommunity className="size-3" />
              Portale strutture
            </Badge>
            <h1 className="text-2xl font-semibold tracking-normal @3xl/main:text-3xl">
              Dashboard operativa
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {numberFormatter.format(structures.length)} strutture,{" "}
              {numberFormatter.format(totals.people)} persone seguite e{" "}
              {numberFormatter.format(totals.services)} servizi tracciati.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            {numberFormatter.format(totals.staff)} operatori
          </Badge>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <SummaryCard
          icon={IconBuildingCommunity}
          label="Strutture"
          value={numberFormatter.format(structures.length)}
          detail="Presidi accessibili"
          isLoading={loading}
        />
        <SummaryCard
          icon={IconUsers}
          label="Persone"
          value={numberFormatter.format(totals.people)}
          detail={`${numberFormatter.format(totals.services)} servizi registrati`}
          isLoading={isLoading}
        />
        <SummaryCard
          icon={IconCalendarEvent}
          label="Promemoria attivi"
          value={numberFormatter.format(totals.reminders)}
          detail={`${numberFormatter.format(totals.accesses)} accessi totali`}
          isLoading={isLoading}
        />
        <SummaryCard
          icon={IconHistory}
          label="Cambi scheda"
          value={numberFormatter.format(totals.history)}
          detail="Movimenti tracciati nello storico"
          isLoading={isLoading}
        />
      </div>

      <div className="flex items-center gap-2">
        <IconChartBar className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Strutture assegnate</h2>
      </div>

      {structures.length === 0 && !loading ? (
        <Card className="rounded-lg">
          <CardContent className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
            Nessuna struttura assegnata
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {structures.map((structure) => (
            <StructureCard
              key={structure.id}
              structure={structure}
              stats={statsByStructure[structure.id]}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
