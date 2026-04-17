"use client";

import {
  IconBriefcase,
  IconHeart,
  IconHome,
  IconMan,
  IconScale,
  IconSchool,
  IconUserQuestion,
  IconUsers,
  IconWoman,
} from "@tabler/icons-react";
import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  Label,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Color palettes for different chart types
const COLORS = {
  gender: {
    Maschio: "hsl(221, 83%, 53%)", // blue
    Femmina: "hsl(330, 81%, 60%)", // pink
    Altro: "hsl(142, 71%, 45%)", // green
    "Non specificato": "hsl(215, 14%, 65%)", // gray
  },
  age: [
    "hsl(221, 83%, 80%)",
    "hsl(221, 83%, 70%)",
    "hsl(221, 83%, 60%)",
    "hsl(221, 83%, 53%)",
    "hsl(221, 83%, 45%)",
    "hsl(221, 83%, 35%)",
    "hsl(221, 83%, 25%)",
  ],
  status: {
    Occupato: "hsl(142, 71%, 45%)",
    "In formazione": "hsl(45, 93%, 47%)",
    Disoccupato: "hsl(0, 84%, 60%)",
    "In cerca di occupazione": "hsl(25, 95%, 53%)",
    Altro: "hsl(215, 14%, 65%)",
  },
  education: [
    "hsl(262, 83%, 58%)",
    "hsl(262, 83%, 68%)",
    "hsl(262, 83%, 78%)",
    "hsl(262, 83%, 48%)",
    "hsl(262, 83%, 38%)",
  ],
  italian: {
    Nessuna: "hsl(0, 84%, 60%)",
    Base: "hsl(25, 95%, 53%)",
    Elementare: "hsl(45, 93%, 47%)",
    Intermedio: "hsl(142, 71%, 45%)",
    Avanzato: "hsl(221, 83%, 53%)",
  },
};

// Gender Distribution Chart
function GenderChart({ data, isLoading }) {
  const chartData = React.useMemo(() => {
    if (!data) return [];
    return Object.entries(data).map(([name, value]) => ({
      name,
      value,
      fill: COLORS.gender[name] || COLORS.gender["Altro"],
    }));
  }, [data]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const chartConfig = {
    value: { label: "Persone" },
    Maschio: { label: "Maschio", color: COLORS.gender["Maschio"] },
    Femmina: { label: "Femmina", color: COLORS.gender["Femmina"] },
    Altro: { label: "Altro", color: COLORS.gender["Altro"] },
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[200px]" />;
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square h-[200px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={80}
          strokeWidth={2}
          stroke="hsl(var(--background))"
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-2xl font-bold"
                    >
                      {total}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 20}
                      className="fill-muted-foreground text-xs"
                    >
                      Totale
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

// Age Distribution Chart
function AgeChart({ data, isLoading }) {
  const chartData = React.useMemo(() => {
    if (!data) return [];
    const order = ["<18", "18-20", "21-30", "31-40", "41-50", "51-60", ">60"];
    return order
      .filter((key) => data[key])
      .map((key, index) => ({
        name: key,
        value: data[key] || 0,
        fill: COLORS.age[index % COLORS.age.length],
      }));
  }, [data]);

  const chartConfig = {
    value: { label: "Persone" },
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[200px]" />;
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
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
          width={45}
          className="text-xs"
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// Job Status Radial Chart
function JobStatusChart({ data, isLoading }) {
  const chartData = React.useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + "..." : name,
        fullName: name,
        value,
        fill: COLORS.status[name] || "hsl(215, 14%, 65%)",
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data]);

  const total = Object.values(data || {}).reduce((sum, val) => sum + val, 0);

  if (isLoading) {
    return <Skeleton className="w-full h-[200px]" />;
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full">
      <div className="space-y-3">
        {chartData.map((item, index) => {
          const percentage =
            total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.fullName} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[150px]" title={item.fullName}>
                  {item.name}
                </span>
                <span className="font-medium tabular-nums">
                  {item.value} ({percentage}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.fill,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Italian Level Chart
function ItalianLevelChart({ data, isLoading }) {
  const chartData = React.useMemo(() => {
    if (!data) return [];
    const order = ["Nessuna", "Base", "Elementare", "Intermedio", "Avanzato"];
    return order
      .filter((key) => data[key] !== undefined)
      .map((key) => ({
        name: key,
        value: data[key] || 0,
        fill: COLORS.italian[key] || "hsl(215, 14%, 65%)",
      }));
  }, [data]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const chartConfig = {
    value: { label: "Persone" },
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[200px]" />;
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart data={chartData} margin={{ left: -10, right: 20 }}>
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// Main Demographics Dashboard Component
export function DemographicsCharts({ stats, isLoading }) {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
      {/* Gender Distribution */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <IconMan className="size-4 text-blue-500" />
              <IconWoman className="size-4 text-pink-500" />
            </div>
            <CardTitle className="text-base">Genere</CardTitle>
          </div>
          <CardDescription>Distribuzione per genere</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <GenderChart data={stats?.byGender} isLoading={isLoading} />
          {!isLoading && stats?.byGender && (
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {Object.entries(stats.byGender).map(([name, value]) => (
                <Badge
                  key={name}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: COLORS.gender[name] }}
                >
                  <span
                    className="size-2 rounded-full mr-1"
                    style={{ backgroundColor: COLORS.gender[name] }}
                  />
                  {name}: {value}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Age Distribution */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <IconUsers className="size-4 text-primary" />
            <CardTitle className="text-base">Età</CardTitle>
          </div>
          <CardDescription>Distribuzione per fascia d'età</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <AgeChart data={stats?.byAgeRange} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Job Status */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <IconBriefcase className="size-4 text-emerald-500" />
            <CardTitle className="text-base">Lavoro</CardTitle>
          </div>
          <CardDescription>Situazione lavorativa</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <JobStatusChart data={stats?.byJobStatus} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Italian Level */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <IconSchool className="size-4 text-violet-500" />
            <CardTitle className="text-base">Italiano</CardTitle>
          </div>
          <CardDescription>Livello di conoscenza</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ItalianLevelChart
            data={stats?.byItalianLevel}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Additional Stats Cards Component
export function AdditionalStatsCards({ stats, isLoading }) {
  const legalStats = stats?.byLegalStatus || {};
  const housingStats = stats?.byHousingStatus || {};
  const vulnerabilityStats = stats?.byVulnerability || {};

  const totalLegal = Object.values(legalStats).reduce((a, b) => a + b, 0);
  const totalHousing = Object.values(housingStats).reduce((a, b) => a + b, 0);
  const totalVulnerability = Object.values(vulnerabilityStats).reduce(
    (a, b) => a + b,
    0,
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
      {/* Legal Status */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <IconScale className="size-4 text-amber-500" />
            <CardTitle className="text-base">Status Legale</CardTitle>
          </div>
          <CardDescription>Situazione documentale</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(legalStats).length === 0 ? (
            <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
              Nessun dato disponibile
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(legalStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, value]) => {
                  const percentage =
                    totalLegal > 0 ? Math.round((value / totalLegal) * 100) : 0;
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate max-w-[180px]" title={name}>
                        {name}
                      </span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {value} ({percentage}%)
                      </Badge>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Housing Status */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <IconHome className="size-4 text-blue-500" />
            <CardTitle className="text-base">Situazione Abitativa</CardTitle>
          </div>
          <CardDescription>Tipologia di alloggio</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(housingStats).length === 0 ? (
            <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
              Nessun dato disponibile
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(housingStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, value]) => {
                  const percentage =
                    totalHousing > 0
                      ? Math.round((value / totalHousing) * 100)
                      : 0;
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate max-w-[180px]" title={name}>
                        {name}
                      </span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {value} ({percentage}%)
                      </Badge>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vulnerability */}
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <IconHeart className="size-4 text-red-500" />
            <CardTitle className="text-base">Vulnerabilità</CardTitle>
          </div>
          <CardDescription>Condizioni segnalate</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(vulnerabilityStats).length === 0 ? (
            <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
              Nessun dato disponibile
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(vulnerabilityStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, value]) => {
                  const percentage =
                    totalVulnerability > 0
                      ? Math.round((value / totalVulnerability) * 100)
                      : 0;
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate max-w-[180px]" title={name}>
                        {name}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs border-red-200 dark:border-red-800"
                      >
                        {value} ({percentage}%)
                      </Badge>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
