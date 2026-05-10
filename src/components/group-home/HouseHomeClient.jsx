"use client";

import {
  IconChartBar,
  IconChecklist,
  IconHomeCog,
  IconUsersGroup,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRef, useState } from "react";
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
import { formatDateLabel } from "@/lib/group-home/helpers";
import { GroupActivitiesManager } from "./GroupActivitiesManager";
import { GroupEvaluationsManager } from "./GroupEvaluationsManager";

export function HouseHomeClient({ initialData, structureId }) {
  const { groupActivities, groupEvaluations, residents } = initialData;
  const activitiesRef = useRef(null);
  const evaluationsRef = useRef(null);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [evaluationsOpen, setEvaluationsOpen] = useState(false);

  const openAndFocus = (targetId, setter, managerRef) => {
    setter(true);

    requestAnimationFrame(() => {
      managerRef.current?.openNew();
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <Card className="border-0 bg-gradient-to-br from-slate-50 via-white to-emerald-50 shadow-sm ring-1 ring-black/5">
        <CardHeader className="gap-4">
          <div className="space-y-2">
            <CardDescription>Casa</CardDescription>
            <CardTitle className="text-2xl">
              Metriche e azioni operative della casa
            </CardTitle>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Il setup completo della casa vive nell'area amministrativa della
              struttura. Qui teniamo le azioni operative del gruppo e le
              metriche che rifiniremo nei prossimi passaggi.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button asChild variant="outline">
              <Link href={`/${structureId}/admin`}>
                <IconHomeCog className="size-4" />
                Setup casa
              </Link>
            </Button>
            <Button
              type="button"
              onClick={() =>
                openAndFocus(
                  "group-activities-section",
                  setActivitiesOpen,
                  activitiesRef,
                )
              }
            >
              <IconUsersGroup className="size-4" />
              Nuova attività di gruppo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                openAndFocus(
                  "group-evaluations-section",
                  setEvaluationsOpen,
                  evaluationsRef,
                )
              }
            >
              <IconChecklist className="size-4" />
              Nuova valutazione di gruppo
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm ring-1 ring-black/5">
          <CardHeader className="pb-3">
            <CardDescription>Metriche casa</CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl">
              <IconChartBar className="size-5" />
              Abitanti attivi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {residents.length} persone in casa
            </Badge>
            <p>Metri che renderemo piu precisi dopo il ricalcolo dedicato.</p>
            <p className="font-medium text-foreground">
              Dato provvisorio basato sugli accessi attivi della casa.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-black/5">
          <CardHeader className="pb-3">
            <CardDescription>Registro operativo</CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl">
              <IconUsersGroup className="size-5" />
              Attività di gruppo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {groupActivities.length} attività registrate
            </Badge>
            <p>
              {groupActivities[0]?.happenedAt
                ? `Ultima attività ${formatDateLabel(groupActivities[0].happenedAt)}`
                : "Nessuna attività ancora inserita"}
            </p>
            <p className="font-medium text-foreground">
              Usa il pulsante azione per aprire il diario operativo.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-black/5">
          <CardHeader className="pb-3">
            <CardDescription>Valutazione periodica</CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl">
              <IconChecklist className="size-5" />
              Valutazioni di gruppo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {groupEvaluations.length} valutazioni registrate
            </Badge>
            <p>
              {groupEvaluations[0]?.evaluatedAt
                ? `Ultima valutazione ${formatDateLabel(groupEvaluations[0].evaluatedAt)}`
                : "Nessuna valutazione ancora inserita"}
            </p>
            <p className="font-medium text-foreground">
              Le metriche finali del gruppo verranno ricalcolate qui.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Collapsible
          id="group-activities-section"
          open={activitiesOpen}
          onOpenChange={setActivitiesOpen}
        >
          <Card className="border-0 shadow-sm ring-1 ring-black/5">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <CardDescription>Registro operativo</CardDescription>
                <CardTitle>Attività di gruppo</CardTitle>
              </div>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline">
                  {activitiesOpen ? "Chiudi attività" : "Apri attività"}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <GroupActivitiesManager
                  ref={activitiesRef}
                  initialEntries={groupActivities}
                  residents={residents}
                  structureId={structureId}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible
          id="group-evaluations-section"
          open={evaluationsOpen}
          onOpenChange={setEvaluationsOpen}
        >
          <Card className="border-0 shadow-sm ring-1 ring-black/5">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <CardDescription>Valutazione periodica</CardDescription>
                <CardTitle>Valutazioni di gruppo</CardTitle>
              </div>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline">
                  {evaluationsOpen ? "Chiudi valutazioni" : "Apri valutazioni"}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <GroupEvaluationsManager
                  ref={evaluationsRef}
                  initialEntries={groupEvaluations}
                  structureId={structureId}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
