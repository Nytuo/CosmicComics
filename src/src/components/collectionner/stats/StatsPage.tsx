import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookCheck,
  BookOpen,
  Clock,
  Flame,
  Gauge,
  HardDrive,
  Layers,
  RefreshCw,
  Star,
  Timer,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import * as StatsAPI from '@/API/StatsAPI';
import type { StatsOverview } from '@/API/StatsAPI';
import * as JellyfinAPI from '@/API/JellyfinAPI';
import {
  ActivityChart,
  ChartCard,
  ColumnChart,
  DonutChart,
  Empty,
  RankingChart,
} from './charts.tsx';
import {
  formatBytes,
  formatDuration,
  shortDate,
  shortMonth,
  weekdayNames,
} from './format.ts';
import { useChartPalette } from './palette.ts';

type Range = '30' | '90' | '365';
type Metric = 'time' | 'pages' | 'books';

const ALL = 'all';
const LOCAL = 'local';
const JELLYFIN = 'jellyfin';
const SERVER_PREFIX = 'jf:';

function scopeToQuery(scope: string): [StatsAPI.StatsSource, string] {
  if (scope === LOCAL) return ['local', ''];
  if (scope === JELLYFIN) return ['jellyfin', ''];
  if (scope.startsWith(SERVER_PREFIX)) {
    return ['jellyfin', scope.slice(SERVER_PREFIX.length)];
  }
  return ['all', ''];
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums leading-tight">
            {value}
          </p>
          {hint && (
            <p className="truncate text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StatsPage() {
  const { t, i18n } = useTranslation();
  const palette = useChartPalette();
  const [servers, setServers] = React.useState<
    JellyfinAPI.JellyfinServerInfo[]
  >([]);
  const [scope, setScope] = React.useState(
    () => localStorage.getItem('stats.scope') ?? ALL
  );
  const [range, setRange] = React.useState<Range>(
    () => (localStorage.getItem('stats.range') as Range) ?? '90'
  );
  const [metric, setMetric] = React.useState<Metric>('time');
  const [data, setData] = React.useState<StatsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const requestId = React.useRef(0);
  const locale = i18n.language;

  React.useEffect(() => {
    JellyfinAPI.listServers()
      .then(setServers)
      .catch(() => setServers([]));
  }, []);

  const load = React.useCallback(
    async (refresh: boolean) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const [source, serverId] = scopeToQuery(scope);
        const overview = await StatsAPI.getOverview(source, serverId, refresh);
        if (id === requestId.current) setData(overview);
      } catch (e) {
        if (id === requestId.current) setError(String(e));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [scope]
  );

  React.useEffect(() => {
    load(false);
  }, [load]);

  React.useEffect(() => {
    localStorage.setItem('stats.scope', scope);
    localStorage.setItem('stats.range', range);
  }, [scope, range]);

  const days = Number(range);
  const daily = React.useMemo(
    () => (data ? data.daily.slice(-days) : []),
    [data, days]
  );

  const activity = React.useMemo(
    () =>
      daily.map((d) => ({
        label: shortDate(d.date, locale),
        value:
          metric === 'time'
            ? Math.round(d.secs / 60)
            : metric === 'pages'
              ? d.pages
              : d.books,
      })),
    [daily, metric, locale]
  );

  const weekdays = React.useMemo(() => weekdayNames(locale), [locale]);

  const statusSlices = data
    ? [
        {
          label: t('mkread'),
          value: data.totals.read,
          color: palette.series[2],
        },
        {
          label: t('mkreading'),
          value: data.totals.reading,
          color: palette.series[3],
        },
        {
          label: t('mkunread'),
          value: data.totals.unread,
          color: palette.muted,
        },
      ]
    : [];

  const sourceColor = (label: string, index: number) =>
    label === 'Local'
      ? palette.series[0]
      : index === 0
        ? palette.jellyfin
        : palette.series[(index + 1) % 8];

  async function clearHistory() {
    setConfirmClear(false);
    try {
      await StatsAPI.clearHistory();
      ToasterHandler(t('stats_cleared'), 'success');
      await load(false);
    } catch (e) {
      ToasterHandler(String(e), 'error');
    }
  }

  const minutes = (v: number) => `${v} ${t('stats_min')}`;
  const noActivity = data !== null && data.reading.sessions === 0;
  const expiredNames = (data?.warnings ?? [])
    .filter((w) => w.startsWith('unauthorized:'))
    .map((w) => w.slice('unauthorized:'.length));
  const otherWarnings = (data?.warnings ?? []).filter((w) =>
    w.startsWith('error:')
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('stats_title')}
          </h2>
          <p className="text-muted-foreground">{t('stats_subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger size="sm" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('stats_source_all')}</SelectItem>
              <SelectItem value={LOCAL}>{t('filter_source_local')}</SelectItem>
              {servers.length > 0 && (
                <SelectItem value={JELLYFIN}>
                  {t('stats_source_jellyfin')}
                </SelectItem>
              )}
              {servers.length > 1 &&
                servers.map((s) => (
                  <SelectItem key={s.id} value={`${SERVER_PREFIX}${s.id}`}>
                    {s.name} · {s.user_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">{t('stats_range_30')}</SelectItem>
              <SelectItem value="90">{t('stats_range_90')}</SelectItem>
              <SelectItem value="365">{t('stats_range_365')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title={t('stats_refresh')}
            disabled={loading}
            onClick={() => load(true)}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title={t('stats_clear')}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expiredNames.length > 0 && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t('jellyfin_expired_home', { name: expiredNames.join(', ') })}
        </p>
      )}
      {otherWarnings.map((w) => (
        <p key={w} className="text-sm text-destructive">
          {w.slice('error:'.length)}
        </p>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!data ? (
        <div className="flex justify-center p-10">
          <Spinner className="size-8" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              icon={BookOpen}
              label={t('stats_kpi_books')}
              value={data.totals.books}
              hint={`${data.totals.series} ${t('series')}`}
            />
            <Kpi
              icon={BookCheck}
              label={t('stats_kpi_read')}
              value={data.totals.read}
              hint={
                data.totals.books > 0
                  ? `${Math.round((data.totals.read * 100) / data.totals.books)}%`
                  : undefined
              }
            />
            <Kpi
              icon={Clock}
              label={t('stats_kpi_time')}
              value={formatDuration(data.reading.total_secs)}
              hint={t('stats_sessions', { count: data.reading.sessions })}
            />
            <Kpi
              icon={Layers}
              label={t('stats_kpi_pages')}
              value={data.reading.pages_read}
              hint={
                data.reading.pages_per_hour > 0
                  ? t('stats_pace', { pace: data.reading.pages_per_hour })
                  : undefined
              }
            />
            <Kpi
              icon={Flame}
              label={t('stats_kpi_streak')}
              value={t('stats_days', { count: data.reading.current_streak })}
              hint={t('stats_longest', { count: data.reading.longest_streak })}
            />
            <Kpi
              icon={Timer}
              label={t('stats_kpi_avg_session')}
              value={formatDuration(data.reading.average_session_secs)}
              hint={t('stats_longest_session', {
                time: formatDuration(data.reading.longest_session_secs),
              })}
            />
            <Kpi
              icon={TrendingUp}
              label={t('stats_kpi_finished')}
              value={data.reading.books_finished}
              hint={t('stats_active_days', { count: data.reading.active_days })}
            />
            <Kpi
              icon={data.totals.rated > 0 ? Star : HardDrive}
              label={
                data.totals.rated > 0
                  ? t('stats_kpi_rating')
                  : t('stats_kpi_size')
              }
              value={
                data.totals.rated > 0
                  ? `${data.totals.average_rating.toFixed(1)} / 5`
                  : formatBytes(data.totals.size_bytes)
              }
              hint={
                data.totals.rated > 0
                  ? t('stats_rated', { count: data.totals.rated })
                  : undefined
              }
            />
          </div>

          <ChartCard
            title={t('stats_chart_activity')}
            rows={activity
              .filter((p) => p.value > 0)
              .slice(-30)
              .map((p) => ({
                label: p.label,
                value: metric === 'time' ? minutes(p.value) : String(p.value),
              }))}
          >
            <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <TabsList className="mb-3">
                <TabsTrigger value="time">{t('stats_metric_time')}</TabsTrigger>
                <TabsTrigger value="pages">
                  {t('stats_metric_pages')}
                </TabsTrigger>
                <TabsTrigger value="books">
                  {t('stats_metric_books')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {noActivity ? (
              <Empty text={t('stats_no_activity')} />
            ) : (
              <ActivityChart
                data={activity}
                color={palette.series[0]}
                format={metric === 'time' ? minutes : String}
                name={t(`stats_metric_${metric}`)}
              />
            )}
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title={t('stats_chart_status')}
              rows={statusSlices.map((s) => ({
                label: s.label,
                value: String(s.value),
              }))}
            >
              <DonutChart
                slices={statusSlices}
                center={
                  <>
                    <span className="text-2xl font-semibold tabular-nums">
                      {data.totals.books}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('books')}
                    </span>
                  </>
                }
              />
            </ChartCard>

            <ChartCard
              title={t('stats_chart_formats')}
              rows={data.formats.map((f) => ({
                label: f.key,
                value: String(f.count),
              }))}
            >
              {data.formats.length === 0 ? (
                <Empty text={t('nothingHere')} />
              ) : (
                <DonutChart
                  slices={data.formats.slice(0, 8).map((f, i) => ({
                    label: f.key,
                    value: f.count,
                    color: palette.series[i % 8],
                  }))}
                  center={
                    <span className="text-2xl font-semibold tabular-nums">
                      {data.formats.length}
                    </span>
                  }
                />
              )}
            </ChartCard>

            <ChartCard
              title={t('stats_chart_sources')}
              rows={data.sources.map((s) => ({
                label: s.key,
                value: String(s.count),
              }))}
            >
              {data.sources.length === 0 ? (
                <Empty text={t('nothingHere')} />
              ) : (
                <DonutChart
                  slices={data.sources.map((s, i) => ({
                    label: s.key,
                    value: s.count,
                    color: sourceColor(s.key, i),
                  }))}
                  center={
                    <Badge variant="secondary">{data.sources.length}</Badge>
                  }
                />
              )}
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title={t('stats_chart_finished')}
              rows={data.finished_by_month.map((m) => ({
                label: m.month,
                value: String(m.count),
              }))}
            >
              <ColumnChart
                data={data.finished_by_month.map((m) => ({
                  label: shortMonth(m.month, locale),
                  value: m.count,
                }))}
                color={palette.series[2]}
                name={t('stats_kpi_finished')}
              />
            </ChartCard>

            <ChartCard
              title={t('stats_chart_added')}
              rows={data.added_by_month.map((m) => ({
                label: m.month,
                value: String(m.count),
              }))}
            >
              {data.added_by_month.every((m) => m.count === 0) ? (
                <Empty text={t('nothingHere')} />
              ) : (
                <ColumnChart
                  data={data.added_by_month.map((m) => ({
                    label: shortMonth(m.month, locale),
                    value: m.count,
                  }))}
                  color={palette.series[4]}
                  name={t('stats_chart_added')}
                />
              )}
            </ChartCard>

            <ChartCard
              title={t('stats_chart_weekday')}
              rows={data.by_weekday.map((secs, i) => ({
                label: weekdays[i],
                value: formatDuration(secs),
              }))}
            >
              {noActivity ? (
                <Empty text={t('stats_no_activity')} />
              ) : (
                <ColumnChart
                  data={data.by_weekday.map((secs, i) => ({
                    label: weekdays[i],
                    value: Math.round(secs / 60),
                  }))}
                  color={palette.series[1]}
                  format={minutes}
                  name={t('stats_metric_time')}
                />
              )}
            </ChartCard>

            <ChartCard
              title={t('stats_chart_hour')}
              rows={data.by_hour
                .map((secs, hour) => ({
                  label: `${String(hour).padStart(2, '0')}:00`,
                  value: formatDuration(secs),
                }))
                .filter((_, hour) => data.by_hour[hour] > 0)}
            >
              {noActivity ? (
                <Empty text={t('stats_no_activity')} />
              ) : (
                <ColumnChart
                  data={data.by_hour.map((secs, hour) => ({
                    label: String(hour).padStart(2, '0'),
                    value: Math.round(secs / 60),
                  }))}
                  color={palette.series[6]}
                  format={minutes}
                  name={t('stats_metric_time')}
                />
              )}
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title={t('stats_chart_ratings')}
              rows={data.ratings.map((count, i) => ({
                label: '★'.repeat(i + 1),
                value: String(count),
              }))}
            >
              {data.totals.rated === 0 ? (
                <Empty text={t('nothingHere')} />
              ) : (
                <ColumnChart
                  data={data.ratings.map((count, i) => ({
                    label: `${i + 1}★`,
                    value: count,
                  }))}
                  color={palette.series[3]}
                  name={t('stats_kpi_books')}
                />
              )}
            </ChartCard>

            <ChartCard
              title={t('stats_chart_time_by_format')}
              rows={data.time_by_format.map((f) => ({
                label: f.key,
                value: formatDuration(f.secs),
              }))}
            >
              {data.time_by_format.length === 0 ? (
                <Empty text={t('stats_no_activity')} />
              ) : (
                <DonutChart
                  slices={data.time_by_format.slice(0, 8).map((f, i) => ({
                    label: f.key,
                    value: Math.round(f.secs / 60),
                    color: palette.series[i % 8],
                  }))}
                  center={
                    <span className="text-lg font-semibold tabular-nums">
                      {formatDuration(data.reading.total_secs)}
                    </span>
                  }
                />
              )}
            </ChartCard>

            <ChartCard
              title={t('stats_chart_genres')}
              rows={data.genres.map((g) => ({
                label: g.key,
                value: String(g.count),
              }))}
            >
              {data.genres.length === 0 ? (
                <Empty text={t('nothingHere')} />
              ) : (
                <RankingChart
                  data={data.genres.map((g) => ({
                    label: g.key,
                    value: g.count,
                  }))}
                  color={palette.series[0]}
                  name={t('stats_kpi_books')}
                />
              )}
            </ChartCard>

            <ChartCard
              title={t('stats_chart_creators')}
              rows={data.creators.map((c) => ({
                label: c.key,
                value: String(c.count),
              }))}
            >
              {data.creators.length === 0 ? (
                <Empty text={t('nothingHere')} />
              ) : (
                <RankingChart
                  data={data.creators.map((c) => ({
                    label: c.key,
                    value: c.count,
                  }))}
                  color={palette.series[4]}
                  name={t('stats_kpi_books')}
                />
              )}
            </ChartCard>

            <ChartCard
              title={t('stats_chart_top_series')}
              rows={data.top_series.map((s) => ({
                label: s.key,
                value: formatDuration(s.secs),
              }))}
            >
              {data.top_series.length === 0 ? (
                <Empty text={t('stats_no_activity')} />
              ) : (
                <RankingChart
                  data={data.top_series.map((s) => ({
                    label: s.key,
                    value: Math.round(s.secs / 60),
                  }))}
                  color={palette.series[1]}
                  format={minutes}
                  name={t('stats_metric_time')}
                />
              )}
            </ChartCard>

            <ChartCard
              title={t('stats_chart_top_books')}
              rows={data.top_books.map((b) => ({
                label: b.key,
                value: formatDuration(b.secs),
              }))}
            >
              {data.top_books.length === 0 ? (
                <Empty text={t('stats_no_activity')} />
              ) : (
                <RankingChart
                  data={data.top_books.map((b) => ({
                    label: b.key,
                    value: Math.round(b.secs / 60),
                  }))}
                  color={palette.series[2]}
                  format={minutes}
                  name={t('stats_metric_time')}
                />
              )}
            </ChartCard>
          </div>

          {data.recent.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                  <Gauge className="h-4 w-4" />
                  {t('stats_recent')}
                </h3>
                <ul className="divide-y text-sm">
                  {data.recent.map((s) => (
                    <li
                      key={`${s.started_at}-${s.title}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {s.title}
                      </span>
                      {s.source === 'jellyfin' && (
                        <Badge className="bg-[#00a4dc] text-white">
                          Jellyfin
                        </Badge>
                      )}
                      {s.completed && <Badge>{t('mkread')}</Badge>}
                      <span className="tabular-nums text-muted-foreground">
                        {formatDuration(s.duration_secs)} · {s.pages_read}{' '}
                        {t('stats_pages_short')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.started_at).toLocaleString(locale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('stats_clear_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('stats_clear_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={clearHistory}>
              {t('stats_clear')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
