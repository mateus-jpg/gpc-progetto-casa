"use client";

import {
  IconAlertTriangle,
  IconArrowRight,
  IconBriefcase,
  IconCalendarEvent,
  IconChartBar,
  IconCircleCheck,
  IconClockHour4,
  IconExchange,
  IconFileText,
  IconHeart,
  IconHistory,
  IconScale,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_COLORS = {
  persons: "hsl(188, 78%, 41%)",
  accesses: "hsl(37, 92%, 50%)",
  services: "hsl(262, 72%, 58%)",
  history: "hsl(348, 76%, 55%)",
  success: "hsl(145, 63%, 42%)",
  warning: "hsl(28, 92%, 53%)",
  muted: "hsl(215, 16%, 55%)",
};

const numberFormatter = new Intl.NumberFormat("it-IT");
const compactFormatter = new Intl.NumberFormat("it-IT", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const TRANSITION_SKELETON_KEYS = [
  "transition-skeleton-1",
  "transition-skeleton-2",
  "transition-skeleton-3",
  "transition-skeleton-4",
  "transition-skeleton-5",
];
const UPCOMING_SKELETON_KEYS = [
  "upcoming-skeleton-1",
  "upcoming-skeleton-2",
  "upcoming-skeleton-3",
];
const TREND_PERIOD_OPTIONS = [
  { value: "weekly", label: "Settimanale" },
  { value: "monthly", label: "Mensile" },
  { value: "yearly", label: "Annuale" },
];
const TREND_PERIOD_LABELS = {
  weekly: "settimanale",
  monthly: "mensile",
  yearly: "annuale",
};

function sumValues(map = {}) {
  return Object.values(map || {}).reduce((sum, value) => sum + (value || 0), 0);
}

function toSortedEntries(map = {}, limit = 6) {
  return Object.entries(map || {})
    .map(([name, value]) => ({ name, value: value || 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function percentage(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function ratio(value, total, digits = 1) {
  if (!total) return "0";
  return (value / total).toLocaleString("it-IT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function parseDate(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value?.toDate === "function") return value.toDate();
  if (value?._seconds) return new Date(value._seconds * 1000);
  return null;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "Nessun movimento";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value) {
  const date = parseDate(value);
  if (!date) return "-";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function daysUntil(value) {
  const date = parseDate(value);
  if (!date) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - startOfToday.getTime()) / 86400000);
}

function dueBadge(value) {
  const days = daysUntil(value);
  if (days === null) return "Da definire";
  if (days === 0) return "Oggi";
  if (days === 1) return "Domani";
  if (days <= 7) return `${days} gg`;
  return formatShortDate(value);
}

function formatMonthLabel(id) {
  if (!id || !/^\d{4}-\d{2}$/.test(id)) return id || "-";
  const [year, month] = id.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, month - 1, 1));
}

function formatWeekLabel(id) {
  const match = /^(\d{4})-W(\d{2})$/.exec(id || "");
  if (!match) return id || "-";

  return `S${Number(match[2])} '${match[1].slice(2)}`;
}

function formatTrendLabel(id, period) {
  if (period === "weekly") return formatWeekLabel(id);
  if (period === "yearly") return id || "-";
  return formatMonthLabel(id);
}

function decodeTransitionKey(key) {
  const parts = String(key || "")
    .split("::")
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });

  return {
    field: parts[0] || "Status",
    before: parts[1] || "Non compilato",
    after: parts[2] || "Non compilato",
  };
}

function buildTrendFlow(trendStats = [], period = "monthly") {
  return trendStats.map((periodStats) => ({
    period: formatTrendLabel(periodStats.id, period),
    persone: periodStats.totalPersons || 0,
    accessi: periodStats.totalAccesses || 0,
    servizi: periodStats.totalServices || sumValues(periodStats.byAccessType),
    cambi: periodStats.totalHistoryEvents || 0,
  }));
}

function MetricCard({
  icon: Icon,
  title,
  value,
  detail,
  accent,
  badge,
  isLoading,
}) {
  return (
    <Card className="rounded-lg @container/card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
            <Icon className="size-4 shrink-0" style={{ color: accent }} />
            <CardDescription className="truncate">{title}</CardDescription>
          </div>
          {badge ? (
            <Badge variant="outline" className="max-w-[140px] truncate">
              {badge}
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-3xl font-semibold tabular-nums">
          {isLoading ? <Skeleton className="h-9 w-24" /> : value}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <p className="text-sm text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

function AttentionScorePanel({ score, level, summary, factors, isLoading }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Priorità operativa</p>
          <div className="mt-1 flex items-end gap-2">
            <div className="text-3xl font-semibold tabular-nums">
              {isLoading ? <Skeleton className="h-9 w-16" /> : score}
            </div>
            {!isLoading ? (
              <span className="pb-1 text-sm text-muted-foreground">/100</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <IconAlertTriangle className="size-8 text-amber-500" />
          {!isLoading ? (
            <Badge variant={level === "Alta" ? "default" : "secondary"}>
              {level}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {summary}
            </p>
            <div className="space-y-2">
              {factors.map((factor) => (
                <div
                  key={factor.label}
                  className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {factor.label}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {factor.detail}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {factor.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TrendFlowChart({ trendStats, period, isLoading }) {
  const chartData = React.useMemo(
    () => buildTrendFlow(trendStats, period),
    [trendStats, period],
  );

  const chartConfig = {
    accessi: { label: "Accessi", color: CHART_COLORS.accesses },
    servizi: { label: "Servizi", color: CHART_COLORS.services },
    cambi: { label: "Cambi", color: CHART_COLORS.history },
  };

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  if (!chartData.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Nessun dato {TREND_PERIOD_LABELS[period]} disponibile
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fillAccessi" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={CHART_COLORS.accesses}
              stopOpacity={0.35}
            />
            <stop
              offset="95%"
              stopColor={CHART_COLORS.accesses}
              stopOpacity={0.03}
            />
          </linearGradient>
          <linearGradient id="fillServizi" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={CHART_COLORS.services}
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor={CHART_COLORS.services}
              stopOpacity={0.03}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="period"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={18}
        />
        <YAxis hide />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          dataKey="accessi"
          type="monotone"
          stroke={CHART_COLORS.accesses}
          fill="url(#fillAccessi)"
          strokeWidth={2}
        />
        <Area
          dataKey="servizi"
          type="monotone"
          stroke={CHART_COLORS.services}
          fill="url(#fillServizi)"
          strokeWidth={2}
        />
        <Area
          dataKey="cambi"
          type="monotone"
          stroke={CHART_COLORS.history}
          fill="transparent"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function TransitionPanel({ stats, isLoading }) {
  const transitions = React.useMemo(
    () =>
      toSortedEntries(stats?.byStatusTransition, 7).map((item) => ({
        ...item,
        ...decodeTransitionKey(item.name),
      })),
    [stats?.byStatusTransition],
  );
  const maxValue = transitions[0]?.value || 1;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {TRANSITION_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!transitions.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Le transizioni appariranno dopo la prossima ricalcolazione
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transitions.map((transition) => (
        <div key={transition.name} className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{transition.field}</p>
              <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{transition.before}</span>
                <IconArrowRight className="size-3 shrink-0" />
                <span className="truncate text-foreground">
                  {transition.after}
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="font-mono">
              {transition.value}
            </Badge>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[hsl(348,76%,55%)]"
              style={{ width: `${(transition.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDaysCount(days) {
  if (!days) return "0 gg";
  if (days >= 365) {
    return `${(days / 365).toLocaleString("it-IT", {
      maximumFractionDigits: 1,
    })} anni`;
  }
  if (days >= 30) {
    return `${(days / 30).toLocaleString("it-IT", {
      maximumFractionDigits: 1,
    })} mesi`;
  }
  return `${days} gg`;
}

function FlowChip({ children, tone = "default" }) {
  const toneClass =
    tone === "target"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`min-w-0 truncate rounded-md border px-2 py-1 text-xs font-medium ${toneClass}`}
      title={children}
    >
      {children}
    </span>
  );
}

function StatusFlowAnalyticsPanel({ statusFlow, fallbackStats, isLoading }) {
  const fields = statusFlow?.fields || [];
  const [selectedFieldKey, setSelectedFieldKey] = React.useState("");

  React.useEffect(() => {
    if (!fields.length) {
      setSelectedFieldKey("");
      return;
    }

    if (!fields.some((field) => field.key === selectedFieldKey)) {
      setSelectedFieldKey(fields[0].key);
    }
  }, [fields, selectedFieldKey]);

  const selectedField =
    fields.find((field) => field.key === selectedFieldKey) || fields[0];
  const maxLinkValue = selectedField?.links?.[0]?.value || 1;
  const blockedTotal =
    selectedField?.blocked?.reduce(
      (sum, status) => sum + status.blockedCount,
      0,
    ) || 0;

  if (isLoading) {
    return (
      <Card className="rounded-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <IconExchange
              className="size-4"
              style={{ color: CHART_COLORS.history }}
            />
            <CardTitle className="text-base">Status Flow Analytics</CardTitle>
          </div>
          <CardDescription>
            Permanenza, ingressi, uscite e blocchi operativi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!selectedField) {
    return (
      <Card className="rounded-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <IconExchange
              className="size-4"
              style={{ color: CHART_COLORS.history }}
            />
            <CardTitle className="text-base">Status Flow Analytics</CardTitle>
          </div>
          <CardDescription>
            Le metriche appariranno dopo i prossimi cambi tracciati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransitionPanel stats={fallbackStats} isLoading={false} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <IconExchange
                className="size-4"
                style={{ color: CHART_COLORS.history }}
              />
              <CardTitle className="text-base">Status Flow Analytics</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Permanenza, ingressi, uscite e blocchi operativi
            </CardDescription>
          </div>
          <Select value={selectedField.key} onValueChange={setSelectedFieldKey}>
            <SelectTrigger size="sm" className="w-full sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {fields.map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 @4xl/main:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Entrati mese</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {numberFormatter.format(selectedField.enteredThisMonth)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Usciti mese</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {numberFormatter.format(selectedField.exitedThisMonth)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Media status</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatDaysCount(selectedField.avgDaysOverall)}
            </p>
          </div>
          <div className="rounded-lg border bg-amber-50 p-3 text-amber-800">
            <p className="text-xs text-amber-700">Possibili blocchi</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {numberFormatter.format(blockedTotal)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 @5xl/main:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold">Flusso cambi status</h4>
              <Badge variant="outline">
                {numberFormatter.format(selectedField.totalTransitions)} cambi
              </Badge>
            </div>
            {selectedField.links?.length ? (
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {selectedField.links.map((link) => (
                  <div
                    key={`${link.from}-${link.to}`}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FlowChip>{link.from}</FlowChip>
                        <IconArrowRight className="size-4 shrink-0 text-muted-foreground" />
                        <FlowChip tone="target">{link.to}</FlowChip>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {link.thisMonth > 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            +{link.thisMonth} mese
                          </Badge>
                        ) : null}
                        <Badge variant="secondary">
                          {numberFormatter.format(link.value)}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[hsl(348,76%,55%)]"
                        style={{
                          width: `${Math.max(8, (link.value / maxLinkValue) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyUpcomingState label="Nessun passaggio tra status" />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold">Permanenza e blocchi</h4>
              <Badge variant="outline">
                {numberFormatter.format(selectedField.totalCurrent)} attivi
              </Badge>
            </div>
            {selectedField.blocked?.length ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <IconAlertTriangle className="size-4" />
                  <h5 className="text-sm font-semibold">
                    Possibile blocco oltre{" "}
                    {statusFlow?.blockedThresholdDays || 30} gg
                  </h5>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedField.blocked.map((status) => (
                    <Badge
                      key={status.name}
                      className="bg-amber-100 text-amber-800 hover:bg-amber-100"
                    >
                      {status.name}: {status.blockedCount}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedField.statuses?.length ? (
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {selectedField.statuses.map((status) => (
                  <div key={status.name} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {status.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Media {formatDaysCount(status.avgDays)}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {numberFormatter.format(status.currentCount)} ora
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Entrati</p>
                        <p className="font-semibold">
                          {numberFormatter.format(status.enteredThisMonth)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Usciti</p>
                        <p className="font-semibold">
                          {numberFormatter.format(status.exitedThisMonth)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Blocco</p>
                        <p className="font-semibold text-amber-700">
                          {numberFormatter.format(status.blockedCount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyUpcomingState label="Nessuno status attivo" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConcentrationList({ title, icon: Icon, data, total, color }) {
  const rows = toSortedEntries(data, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4" style={{ color }} />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate" title={item.name}>
                  {item.name}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {percentage(item.value, total)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percentage(item.value, total)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>
      )}
    </div>
  );
}

function ClassificationDonut({ stats, isLoading }) {
  const chartData = React.useMemo(() => {
    const colors = [
      CHART_COLORS.success,
      CHART_COLORS.accesses,
      CHART_COLORS.services,
      CHART_COLORS.muted,
    ];
    return toSortedEntries(stats?.byClassification, 4).map((item, index) => ({
      ...item,
      fill: colors[index % colors.length],
    }));
  }, [stats?.byClassification]);

  const chartConfig = {
    value: { label: "Interventi" },
  };

  if (isLoading) return <Skeleton className="h-[220px] w-full" />;

  if (!chartData.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Nessun dato disponibile
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={88}
          paddingAngle={3}
          strokeWidth={0}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

function EmptyUpcomingState({ label }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function UpcomingListSkeleton() {
  return (
    <div className="space-y-3">
      {UPCOMING_SKELETON_KEYS.map((key) => (
        <Skeleton key={key} className="h-[72px] w-full" />
      ))}
    </div>
  );
}

function buildActionCenterItems(
  reminders = [],
  expiringFiles = [],
  structureId,
) {
  const reminderItems = reminders.map((item) => ({
    id: `reminder-${item.id}`,
    type: "reminder",
    title: item.serviceType || "Promemoria",
    subtitle: [
      item.personName || "Scheda anagrafica",
      item.enteRiferimento,
      item.note,
    ]
      .filter(Boolean)
      .join(" · "),
    date: item.dueAt,
    href:
      item.accessId && item.anagraficaId
        ? `/${structureId}/anagrafica/${item.anagraficaId}/accessi/${item.accessId}`
        : `/${structureId}/anagrafica${item.anagraficaId ? `/${item.anagraficaId}` : ""}`,
  }));

  const fileItems = expiringFiles.map((item) => ({
    id: `file-${item.source}-${item.id}`,
    type: "file",
    title: item.name || "Documento in scadenza",
    subtitle:
      item.source === "structure"
        ? "Documenti struttura"
        : item.personName || item.category || "Documento personale",
    date: item.expiresAt,
    href:
      item.source === "structure" || !item.anagraficaId
        ? `/${structureId}/documenti`
        : item.source === "reminder"
          ? `/${structureId}/anagrafica/${item.anagraficaId}`
          : `/${structureId}/anagrafica/${item.anagraficaId}/files`,
  }));

  return [...reminderItems, ...fileItems]
    .sort((a, b) => {
      const aTime = parseDate(a.date)?.getTime() || 0;
      const bTime = parseDate(b.date)?.getTime() || 0;
      return aTime - bTime;
    })
    .slice(0, 8);
}

function ActionCenterItem({ item }) {
  const Icon = item.type === "reminder" ? IconCalendarEvent : IconFileText;
  const days = daysUntil(item.date);
  const tone =
    item.type === "reminder"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "bg-rose-500/10 text-rose-600 dark:text-rose-300";

  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 rounded-lg border p-3 transition hover:border-primary/40 hover:bg-muted/40"
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-md ${tone}`}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <Badge variant={days !== null && days <= 7 ? "default" : "outline"}>
            {dueBadge(item.date)}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {item.subtitle || "Dettaglio operativo"}
        </p>
      </div>
      <IconArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function ActionCenterPanel({
  structureId,
  reminders,
  expiringFiles,
  daysAhead,
  isLoading,
}) {
  const actionItems = React.useMemo(
    () => buildActionCenterItems(reminders, expiringFiles, structureId),
    [reminders, expiringFiles, structureId],
  );
  const todayCount = actionItems.filter(
    (item) => daysUntil(item.date) === 0,
  ).length;
  const weekCount = actionItems.filter((item) => {
    const days = daysUntil(item.date);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const fileCount = actionItems.filter((item) => item.type === "file").length;

  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="size-4 text-amber-500" />
              <CardTitle className="text-base">Centro operativo</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Priorita nei prossimi {daysAhead} giorni
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{todayCount} oggi</Badge>
            <Badge variant="outline">{weekCount} entro 7 gg</Badge>
            <Badge variant="outline">{fileCount} file</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <UpcomingListSkeleton />
        ) : actionItems.length ? (
          <div className="grid gap-3 @4xl/main:grid-cols-2">
            {actionItems.map((item) => (
              <ActionCenterItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyUpcomingState label="Nessuna priorita operativa" />
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingReminderItem({ item, structureId }) {
  const href =
    item.accessId && item.anagraficaId
      ? `/${structureId}/anagrafica/${item.anagraficaId}/accessi/${item.accessId}`
      : `/${structureId}/anagrafica${item.anagraficaId ? `/${item.anagraficaId}` : ""}`;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border p-3 transition hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
        <span className="text-sm font-semibold leading-none">
          {formatShortDate(item.dueAt).split(" ")[0]}
        </span>
        <span className="mt-1 text-[10px] uppercase leading-none">
          {formatShortDate(item.dueAt).split(" ")[1] || ""}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {item.serviceType || "Promemoria"}
          </p>
          <Badge variant="secondary" className="shrink-0">
            {dueBadge(item.dueAt)}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {item.personName || "Scheda anagrafica"}
          {item.enteRiferimento ? ` · ${item.enteRiferimento}` : ""}
        </p>
        {item.note ? (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {item.note}
          </p>
        ) : null}
      </div>
      <IconArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function ExpiringFileItem({ item, structureId }) {
  const href =
    item.source === "structure" || !item.anagraficaId
      ? `/${structureId}/documenti`
      : item.source === "reminder"
        ? `/${structureId}/anagrafica/${item.anagraficaId}`
        : `/${structureId}/anagrafica/${item.anagraficaId}/files`;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border p-3 transition hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-300">
        <IconFileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <Badge variant="outline" className="shrink-0">
            {dueBadge(item.expiresAt)}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {item.source === "structure"
            ? "Documenti struttura"
            : item.source === "reminder"
              ? item.personName || "Documento promemoria"
              : item.personName || "Documento personale"}
        </p>
        {item.category ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {item.category}
          </p>
        ) : null}
      </div>
      <IconArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function UpcomingOperationsPanel({ structureId, upcomingItems, isLoading }) {
  const reminders = upcomingItems?.reminders || [];
  const expiringFiles = upcomingItems?.expiringFiles || [];
  const daysAhead = upcomingItems?.daysAhead || 30;

  return (
    <div className="space-y-4">
      <ActionCenterPanel
        structureId={structureId}
        reminders={reminders}
        expiringFiles={expiringFiles}
        daysAhead={daysAhead}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 gap-4 @5xl/main:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <IconCalendarEvent
                    className="size-4"
                    style={{ color: CHART_COLORS.accesses }}
                  />
                  <CardTitle className="text-base">
                    Promemoria in arrivo
                  </CardTitle>
                </div>
                <CardDescription className="mt-1">
                  Prossimi {daysAhead} giorni
                </CardDescription>
              </div>
              <Badge variant="secondary">{reminders.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <UpcomingListSkeleton />
            ) : reminders.length ? (
              <div className="space-y-3">
                {reminders.map((item) => (
                  <UpcomingReminderItem
                    key={item.id}
                    item={item}
                    structureId={structureId}
                  />
                ))}
              </div>
            ) : (
              <EmptyUpcomingState label="Nessun promemoria in arrivo" />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <IconFileText
                    className="size-4"
                    style={{ color: CHART_COLORS.history }}
                  />
                  <CardTitle className="text-base">File in scadenza</CardTitle>
                </div>
                <CardDescription className="mt-1">
                  Prossimi {daysAhead} giorni
                </CardDescription>
              </div>
              <Badge variant="secondary">{expiringFiles.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <UpcomingListSkeleton />
            ) : expiringFiles.length ? (
              <div className="space-y-3">
                {expiringFiles.map((item) => (
                  <ExpiringFileItem
                    key={`${item.source}-${item.id}`}
                    item={item}
                    structureId={structureId}
                  />
                ))}
              </div>
            ) : (
              <EmptyUpcomingState label="Nessun file in scadenza" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DashboardInsights({
  structureId,
  stats,
  trendStats,
  trendPeriod,
  onTrendPeriodChange,
  upcomingItems,
  statusFlow,
  isLoading,
  isTrendLoading,
  isUpcomingLoading,
  isStatusFlowLoading,
}) {
  const totalPersons = stats?.totalPersons || 0;
  const totalAccesses = stats?.totalAccesses || 0;
  const totalServices = stats?.totalServices || sumValues(stats?.byAccessType);
  const totalFiles = stats?.totalFiles || 0;
  const filesWithExpiration = stats?.filesWithExpiration || 0;
  const activeReminders = stats?.activeReminders || 0;
  const completedReminders = stats?.completedReminders || 0;
  const totalRemindersCreated = stats?.totalRemindersCreated || 0;
  const totalHistoryEvents = stats?.totalHistoryEvents || 0;
  const pendingRegistrations =
    stats?.byRegistrationStatus?.["Firma in attesa"] ||
    stats?.byRegistrationStatus?.draft_signature_pending ||
    0;

  const topService = toSortedEntries(stats?.byAccessType, 1)[0];
  const topChangedField = toSortedEntries(stats?.byHistoryField, 1)[0];
  const topVulnerability = toSortedEntries(stats?.byVulnerability, 1)[0];
  const topLegal = toSortedEntries(stats?.byLegalStatus, 1)[0];

  const reminderCompletion = percentage(
    completedReminders,
    totalRemindersCreated,
  );
  const reminderPressure = percentage(
    activeReminders,
    Math.max(totalPersons, 1),
  );
  const pendingRegistrationPressure = percentage(
    pendingRegistrations,
    Math.max(totalPersons, 1),
  );
  const fileExpiryPressure = percentage(
    filesWithExpiration,
    Math.max(totalFiles, 1),
  );
  const vulnerabilityPressure = percentage(
    topVulnerability?.value || 0,
    Math.max(totalPersons, 1),
  );
  const attentionScore = Math.min(
    100,
    Math.round(
      reminderPressure * 0.7 +
        pendingRegistrationPressure * 0.8 +
        fileExpiryPressure * 0.2 +
        vulnerabilityPressure * 0.3,
    ),
  );
  const attentionLevel =
    attentionScore >= 70 ? "Alta" : attentionScore >= 35 ? "Media" : "Bassa";
  const attentionSummary =
    attentionLevel === "Alta"
      ? "Molti segnali richiedono controllo operativo: promemoria, firme, scadenze o vulnerabilità pesano sulla struttura."
      : attentionLevel === "Media"
        ? "Ci sono alcuni segnali da monitorare: il punteggio cresce quando aumentano attività aperte e scadenze."
        : "La pressione operativa appare contenuta rispetto alle persone seguite e ai documenti tracciati.";
  const attentionFactors = [
    {
      label: "Promemoria aperti",
      value: numberFormatter.format(activeReminders),
      detail: `${reminderPressure}% rispetto alle persone seguite`,
    },
    {
      label: "Firme in attesa",
      value: numberFormatter.format(pendingRegistrations),
      detail: `${pendingRegistrationPressure}% registrazioni non completate`,
    },
    {
      label: "Documenti con scadenza",
      value: numberFormatter.format(filesWithExpiration),
      detail: `${fileExpiryPressure}% dei documenti caricati`,
    },
    {
      label: topVulnerability?.name || "Vulnerabilità prevalente",
      value: numberFormatter.format(topVulnerability?.value || 0),
      detail: `${vulnerabilityPressure}% delle persone seguite`,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="grid gap-4 p-5 @3xl/main:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <IconChartBar className="size-3" />
                Dashboard operativa
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <IconClockHour4 className="size-3" />
                {formatDate(stats?.lastHistoryEventAt || stats?.updatedAt)}
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal @3xl/main:text-3xl">
                Movimento, bisogni e presa in carico
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {numberFormatter.format(totalPersons)} persone,{" "}
                {numberFormatter.format(totalServices)} servizi registrati e{" "}
                {numberFormatter.format(totalHistoryEvents)} cambi di scheda.
              </p>
            </div>
          </div>

          {/* <AttentionScorePanel
            score={attentionScore}
            level={attentionLevel}
            summary={attentionSummary}
            factors={attentionFactors}
            isLoading={isLoading}
          /> */}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <MetricCard
          icon={IconUsers}
          title="Persone seguite"
          value={numberFormatter.format(totalPersons)}
          detail={`${numberFormatter.format(pendingRegistrations)} registrazioni con firma in attesa`}
          accent={CHART_COLORS.persons}
          badge={`${percentage(pendingRegistrations, totalPersons)}% bozze`}
          isLoading={isLoading}
        />
        <MetricCard
          icon={IconBriefcase}
          title="Intensità servizi"
          value={ratio(totalServices, totalPersons)}
          detail={`${numberFormatter.format(totalAccesses)} accessi, ${numberFormatter.format(totalServices)} servizi`}
          accent={CHART_COLORS.services}
          badge={topService ? topService.name : "Servizi"}
          isLoading={isLoading}
        />
        <MetricCard
          icon={IconHistory}
          title="Cambi tracciati"
          value={numberFormatter.format(totalHistoryEvents)}
          detail={
            topChangedField
              ? `${topChangedField.name} più modificato`
              : "Storico in aggiornamento"
          }
          accent={CHART_COLORS.history}
          badge={
            topChangedField
              ? compactFormatter.format(topChangedField.value)
              : "0"
          }
          isLoading={isLoading}
        />
        <MetricCard
          icon={IconCalendarEvent}
          title="Agenda operativa"
          value={numberFormatter.format(activeReminders)}
          detail={`${reminderCompletion}% promemoria completati`}
          accent={CHART_COLORS.accesses}
          badge={`${numberFormatter.format(filesWithExpiration)} doc. in scadenza`}
          isLoading={isLoading}
        />
      </div>

      <UpcomingOperationsPanel
        structureId={structureId}
        upcomingItems={upcomingItems}
        isLoading={isUpcomingLoading}
      />

      <Card className="rounded-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 @lg/card:flex-row @lg/card:items-start @lg/card:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <IconChartBar
                  className="size-4"
                  style={{ color: CHART_COLORS.accesses }}
                />
                <CardTitle className="text-base">
                  Flusso {TREND_PERIOD_LABELS[trendPeriod]}
                </CardTitle>
              </div>
              <CardDescription className="mt-1">
                Accessi, servizi e modifiche registrate
              </CardDescription>
            </div>
            <Select value={trendPeriod} onValueChange={onTrendPeriodChange}>
              <SelectTrigger size="sm" className="w-[136px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {TREND_PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <TrendFlowChart
            trendStats={trendStats}
            period={trendPeriod}
            isLoading={isTrendLoading}
          />
        </CardContent>
      </Card>

      <StatusFlowAnalyticsPanel
        statusFlow={statusFlow}
        fallbackStats={stats}
        isLoading={isStatusFlowLoading}
      />

      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <IconHeart
                className="size-4"
                style={{ color: CHART_COLORS.history }}
              />
              <CardTitle className="text-base">
                Concentrazioni di bisogno
              </CardTitle>
            </div>
            <CardDescription>
              Status, vulnerabilità e provenienza dei bisogni più presenti
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 @2xl/card:grid-cols-2">
            <ConcentrationList
              title="Situazione legale"
              icon={IconScale}
              data={stats?.byLegalStatus}
              total={sumValues(stats?.byLegalStatus)}
              color={CHART_COLORS.accesses}
            />
            <ConcentrationList
              title="Vulnerabilità"
              icon={IconHeart}
              data={stats?.byVulnerability}
              total={sumValues(stats?.byVulnerability) || totalPersons}
              color={CHART_COLORS.history}
            />
            <ConcentrationList
              title="Campi modificati"
              icon={IconHistory}
              data={stats?.byHistoryField}
              total={sumValues(stats?.byHistoryField)}
              color={CHART_COLORS.services}
            />
            <ConcentrationList
              title="Enti collegati"
              icon={IconFileText}
              data={stats?.byReferralEntity}
              total={sumValues(stats?.byReferralEntity)}
              color={CHART_COLORS.persons}
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <IconCircleCheck
                className="size-4"
                style={{ color: CHART_COLORS.success }}
              />
              <CardTitle className="text-base">Presa in carico</CardTitle>
            </div>
            <CardDescription>
              Classificazione degli interventi e stato delle schede
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 @2xl/card:grid-cols-[240px_1fr]">
            <ClassificationDonut stats={stats} isLoading={isLoading} />
            <div className="space-y-4">
              <ConcentrationList
                title="Registrazioni"
                icon={IconUsers}
                data={stats?.byRegistrationStatus}
                total={totalPersons}
                color={CHART_COLORS.success}
              />
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Documenti per accesso</p>
                    <p className="text-xs text-muted-foreground">
                      {numberFormatter.format(totalFiles)} documenti totali
                    </p>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {ratio(totalFiles, totalAccesses)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Segnale prevalente</p>
                    <p className="text-xs text-muted-foreground">
                      {topLegal?.name ||
                        topVulnerability?.name ||
                        "Nessun dato"}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {compactFormatter.format(
                      topLegal?.value || topVulnerability?.value || 0,
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
