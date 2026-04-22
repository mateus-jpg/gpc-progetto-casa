"use client";

import {
  IconChartBar,
  IconClipboardList,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import { use, useState } from "react";
import {
  AdditionalStatsCards,
  BirthPlaceMap,
  DashboardInsights,
  DemographicsCharts,
  ServicesCharts,
} from "@/components/statistics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useStatistics,
  useStructureStatusFlowAnalytics,
  useStructureUpcomingItems,
  useTrendStatistics,
} from "@/hooks/use-statistics";

const TREND_LIMIT_BY_PERIOD = {
  weekly: 12,
  monthly: 12,
  yearly: 5,
};

export default function Page({ params }) {
  const { structureId } = use(params);
  const [trendPeriod, setTrendPeriod] = useState("monthly");
  const { stats, isLoading } = useStatistics(structureId);
  const { upcomingItems, isLoading: isUpcomingLoading } =
    useStructureUpcomingItems(structureId, 30, 8);
  const { statusFlow, isLoading: isStatusFlowLoading } =
    useStructureStatusFlowAnalytics(structureId);
  const { trendStats, isLoading: isTrendLoading } = useTrendStatistics(
    structureId,
    trendPeriod,
    TREND_LIMIT_BY_PERIOD[trendPeriod],
  );

  return (
    <div className="@container/main flex flex-col gap-6">
      <Tabs defaultValue="insights" className="px-4 lg:px-6">
        <TabsList className="mb-4 grid h-auto w-full grid-cols-2 @3xl/main:w-fit @3xl/main:grid-cols-4">
          <TabsTrigger value="insights" className="gap-2">
            <IconChartBar className="size-4" />
            <span>Insight</span>
          </TabsTrigger>
          <TabsTrigger value="demographics" className="gap-2">
            <IconUsers className="size-4" />
            <span>Demografia</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <IconClipboardList className="size-4" />
            <span>Servizi</span>
          </TabsTrigger>
          <TabsTrigger value="geography" className="gap-2">
            <IconWorld className="size-4" />
            <span>Geografia</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-0">
          <DashboardInsights
            structureId={structureId}
            stats={stats}
            trendStats={trendStats}
            trendPeriod={trendPeriod}
            onTrendPeriodChange={setTrendPeriod}
            upcomingItems={upcomingItems}
            statusFlow={statusFlow}
            isLoading={isLoading}
            isTrendLoading={isTrendLoading}
            isUpcomingLoading={isUpcomingLoading}
            isStatusFlowLoading={isStatusFlowLoading}
          />
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6 mt-0">
          <DemographicsCharts stats={stats} isLoading={isLoading} />
          <AdditionalStatsCards stats={stats} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="services" className="space-y-6 mt-0">
          <ServicesCharts stats={stats} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="geography" className="space-y-6 mt-0">
          <BirthPlaceMap stats={stats} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
