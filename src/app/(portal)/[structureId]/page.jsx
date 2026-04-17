"use client";

import {
  IconChartBar,
  IconClipboardList,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import { use } from "react";
import { SectionCards } from "@/components/section-cards";
import {
  AdditionalStatsCards,
  BirthPlaceMap,
  DemographicsCharts,
  ServicesCharts,
} from "@/components/statistics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStatistics } from "@/hooks/use-statistics";

export default function Page({ params }) {
  const { structureId } = use(params);
  const { stats, isLoading } = useStatistics(structureId);

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Header Stats Cards */}
      <SectionCards stats={stats} isLoading={isLoading} />

      {/* Tabbed Content for Different Views */}
      <Tabs defaultValue="overview" className="px-4 lg:px-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview" className="gap-2">
            <IconChartBar className="size-4" />
            <span className="hidden sm:inline">Panoramica</span>
          </TabsTrigger>
          <TabsTrigger value="demographics" className="gap-2">
            <IconUsers className="size-4" />
            <span className="hidden sm:inline">Demografia</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <IconClipboardList className="size-4" />
            <span className="hidden sm:inline">Servizi</span>
          </TabsTrigger>
          <TabsTrigger value="geography" className="gap-2">
            <IconWorld className="size-4" />
            <span className="hidden sm:inline">Geografia</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          {/* Birth Place Map */}
          <BirthPlaceMap stats={stats} isLoading={isLoading} />

          {/* Quick Demographics Overview */}
          <DemographicsCharts stats={stats} isLoading={isLoading} />
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6 mt-0">
          <DemographicsCharts stats={stats} isLoading={isLoading} />
          <AdditionalStatsCards stats={stats} isLoading={isLoading} />
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6 mt-0">
          <ServicesCharts stats={stats} isLoading={isLoading} />
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography" className="space-y-6 mt-0">
          <BirthPlaceMap stats={stats} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
