"use client";

import {
  IconBriefcase,
  IconCalendarEvent,
  IconFileText,
  IconTrendingDown,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SectionCards({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="@container/card">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16 mt-2" />
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  const totalPersons = stats?.totalPersons || 0;
  const activeReminders = stats?.activeReminders || 0;
  const totalFiles = stats?.totalFiles || 0;
  const totalAccesses = stats?.totalAccesses || 0;

  // Calculate job status summary
  const jobStats = stats?.byJobStatus || {};
  const employed = jobStats["Occupato"] || jobStats["occupato"] || 0;
  const inTraining =
    jobStats["In formazione"] || jobStats["in formazione"] || 0;
  const totalJobTracked = Object.values(jobStats).reduce((a, b) => a + b, 0);
  const employmentRate =
    totalJobTracked > 0
      ? Math.round(((employed + inTraining) / totalJobTracked) * 100)
      : 0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUsers className="size-4" />
            Persone Registrate
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalPersons.toLocaleString("it-IT")}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="text-emerald-600 dark:text-emerald-400"
            >
              <IconTrendingUp className="size-3" />
              Attivo
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Database anagrafica community
          </div>
          <div className="text-muted-foreground">
            {Object.keys(stats?.byBirthPlace || {}).length} paesi di provenienza
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconCalendarEvent className="size-4" />
            Promemoria Attivi
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeReminders.toLocaleString("it-IT")}
          </CardTitle>
          <CardAction>
            {activeReminders > 5 ? (
              <Badge
                variant="outline"
                className="text-amber-600 dark:text-amber-400"
              >
                <IconTrendingUp className="size-3" />
                Attenzione
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-emerald-600 dark:text-emerald-400"
              >
                <IconTrendingDown className="size-3" />
                Sotto controllo
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Scadenze e appuntamenti
          </div>
          <div className="text-muted-foreground">
            {stats?.completedReminders || 0} completati
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconFileText className="size-4" />
            Documenti Caricati
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalFiles.toLocaleString("it-IT")}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="text-blue-600 dark:text-blue-400"
            >
              <IconTrendingUp className="size-3" />
              Gestiti
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Archivio documentale
          </div>
          <div className="text-muted-foreground">
            {stats?.filesWithExpiration || 0} con scadenza
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconBriefcase className="size-4" />
            Totale Accessi
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalAccesses.toLocaleString("it-IT")}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="text-violet-600 dark:text-violet-400"
            >
              {employmentRate}% attivi
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Servizi erogati
          </div>
          <div className="text-muted-foreground">
            {Object.keys(stats?.byAccessType || {}).length} tipologie di
            servizio
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
