"use client";

import {
  IconBuildingCommunity,
  IconCategory,
  IconChartTreemap,
  IconClipboardList,
} from "@tabler/icons-react";
import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const SERVICES_SKELETON_KEYS = [
  "accesses",
  "categories",
  "files",
  "reminders",
  "operators",
];

// Color palette for services
const SERVICE_COLORS = [
  "hsl(221, 83%, 53%)", // blue
  "hsl(262, 83%, 58%)", // purple
  "hsl(330, 81%, 60%)", // pink
  "hsl(142, 71%, 45%)", // green
  "hsl(45, 93%, 47%)", // yellow
  "hsl(25, 95%, 53%)", // orange
  "hsl(0, 84%, 60%)", // red
  "hsl(180, 70%, 45%)", // teal
  "hsl(291, 64%, 42%)", // magenta
  "hsl(199, 89%, 48%)", // sky
];

const CLASSIFICATION_COLORS = {
  "Presa in carico": "hsl(142, 71%, 45%)",
  Informativa: "hsl(221, 83%, 53%)",
  Referral: "hsl(262, 83%, 58%)",
};

// Access Type Chart (Horizontal Bar)
function AccessTypeChart({ data, isLoading }) {
  const chartData = React.useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .map(([name, value], index) => ({
        name: name.length > 25 ? `${name.substring(0, 25)}...` : name,
        fullName: name,
        value,
        fill: SERVICE_COLORS[index % SERVICE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

  const chartConfig = {
    value: { label: "Accessi" },
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[280px]" />;
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 0, right: 20 }}
      >
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={120}
          className="text-xs"
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-background border rounded-lg px-3 py-2 shadow-lg">
                  <p className="font-medium text-sm">{data.fullName}</p>
                  <p className="text-muted-foreground text-xs">
                    {data.value} accessi
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// Classification Donut Stats
function ClassificationStats({ data, isLoading }) {
  const stats = React.useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .map(([name, value]) => ({
        name,
        value,
        color: CLASSIFICATION_COLORS[name] || "hsl(215, 14%, 65%)",
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = stats.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return <Skeleton className="w-full h-[140px]" />;
  }

  if (!stats.length) {
    return (
      <div className="flex items-center justify-center h-[140px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stats.map((item) => {
        const percentage =
          total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">
                {item.value} ({percentage}%)
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Subcategory Treemap
function SubcategoryTreemap({ data, isLoading }) {
  const treeData = React.useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .map(([name, value], index) => ({
        name: name.length > 20 ? `${name.substring(0, 20)}...` : name,
        fullName: name,
        size: value,
        fill: SERVICE_COLORS[index % SERVICE_COLORS.length],
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 12);
  }, [data]);

  if (isLoading) {
    return <Skeleton className="w-full h-[200px]" />;
  }

  if (!treeData.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <Treemap
        data={treeData}
        dataKey="size"
        nameKey="name"
        stroke="hsl(var(--background))"
        strokeWidth={2}
        content={({ x, y, width, height, name, fill, size }) => {
          if (width < 40 || height < 30) return null;
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={fill}
                rx={4}
                className="transition-opacity hover:opacity-80 cursor-pointer"
              />
              {width > 60 && height > 40 && (
                <>
                  <text
                    x={x + width / 2}
                    y={y + height / 2 - 6}
                    textAnchor="middle"
                    fill="white"
                    className="text-xs font-medium"
                    style={{ fontSize: Math.min(12, width / 8) }}
                  >
                    {name}
                  </text>
                  <text
                    x={x + width / 2}
                    y={y + height / 2 + 10}
                    textAnchor="middle"
                    fill="white"
                    className="text-xs opacity-80"
                    style={{ fontSize: Math.min(10, width / 10) }}
                  >
                    {size}
                  </text>
                </>
              )}
            </g>
          );
        }}
      />
    </ResponsiveContainer>
  );
}

// Referral Entities List
function ReferralEntitiesList({ data, isLoading }) {
  const entities = React.useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = entities.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {SERVICES_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!entities.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <ScrollArea className="h-[200px] pr-4">
      <div className="space-y-2">
        {entities.map((item, index) => {
          const _percentage =
            total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div
              key={item.name}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className={`
                flex items-center justify-center size-6 rounded text-xs font-bold
                ${index < 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
              `}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={item.name}>
                  {item.name}
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {item.value}
              </Badge>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Main Services Dashboard Component
export function ServicesCharts({ stats, isLoading }) {
  const totalAccesses = stats?.totalAccesses || 0;
  const totalSubcategories = Object.keys(stats?.bySubcategory || {}).length;
  const totalEntities = Object.keys(stats?.byReferralEntity || {}).length;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4 @lg/main:grid-cols-4">
        <Card className="@container/card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    totalAccesses.toLocaleString("it-IT")
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Totale Accessi</p>
              </div>
              <IconClipboardList className="size-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    Object.keys(stats?.byAccessType || {}).length
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tipi di Servizio
                </p>
              </div>
              <IconCategory className="size-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    totalSubcategories
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Sottocategorie</p>
              </div>
              <IconChartTreemap className="size-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    totalEntities
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Enti Collegati</p>
              </div>
              <IconBuildingCommunity className="size-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        {/* Access Types */}
        <Card className="@container/card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <IconClipboardList className="size-4 text-primary" />
              <CardTitle className="text-base">Tipologie di Accesso</CardTitle>
            </div>
            <CardDescription>
              Distribuzione per tipo di servizio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccessTypeChart data={stats?.byAccessType} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Classification */}
        <Card className="@container/card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <IconCategory className="size-4 text-violet-500" />
              <CardTitle className="text-base">
                Classificazione Interventi
              </CardTitle>
            </div>
            <CardDescription>
              Presa in carico, Informativa, Referral
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClassificationStats
              data={stats?.byClassification}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Subcategories Treemap */}
        <Card className="@container/card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <IconChartTreemap className="size-4 text-emerald-500" />
              <CardTitle className="text-base">Mappa Sottocategorie</CardTitle>
            </div>
            <CardDescription>
              Visualizzazione gerarchica dei servizi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubcategoryTreemap
              data={stats?.bySubcategory}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Referral Entities */}
        <Card className="@container/card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <IconBuildingCommunity className="size-4 text-amber-500" />
              <CardTitle className="text-base">Enti di Riferimento</CardTitle>
            </div>
            <CardDescription>Partner e istituzioni coinvolte</CardDescription>
          </CardHeader>
          <CardContent>
            <ReferralEntitiesList
              data={stats?.byReferralEntity}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
