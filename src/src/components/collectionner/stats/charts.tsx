import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { truncate } from './format.ts';

const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)' };
const GRID = 'var(--border)';
const CHART_HEIGHT = 240;

const tooltipStyle: React.CSSProperties = {
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
};

export interface TableRow {
  label: string;
  value: string;
}

export function ChartCard({
  title,
  children,
  rows,
  className,
}: {
  title: string;
  children: React.ReactNode;
  rows?: TableRow[];
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
        {rows && rows.length > 0 && (
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">
              {t('stats_table')}
            </summary>
            <table className="mt-2 w-full">
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.label}-${i}`} className="border-t">
                    <td className="py-1 pr-2">{row.label}</td>
                    <td className="py-1 text-right tabular-nums">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-muted-foreground"
      style={{ height: CHART_HEIGHT }}
    >
      {text}
    </div>
  );
}

interface Point {
  label: string;
  value: number;
}

export function ActivityChart({
  data,
  color,
  format,
  name,
}: {
  data: Point[];
  color: string;
  format: (value: number) => string;
  name: string;
}) {
  const id = React.useId();
  const interval = Math.max(0, Math.floor(data.length / 6) - 1);
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={interval}
        />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={format}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: 3 }}
          formatter={(value) => [format(Number(value)), name]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${id})`}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ColumnChart({
  data,
  color,
  format = (v) => String(v),
  name,
}: {
  data: Point[];
  color: string;
  format?: (value: number) => string;
  name: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={data.length > 12 ? 2 : 0}
        />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={format}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
          formatter={(value) => [format(Number(value)), name]}
        />
        <Bar
          dataKey="value"
          fill={color}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RankingChart({
  data,
  color,
  format = (v) => String(v),
  name,
}: {
  data: Point[];
  color: string;
  format?: (value: number) => string;
  name: string;
}) {
  const height = Math.max(120, data.length * 30 + 16);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
      >
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={format}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={116}
          tickFormatter={(v: string) => truncate(v, 18)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
          formatter={(value) => [format(Number(value)), name]}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface Slice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  slices,
  center,
}: {
  slices: Slice[];
  center: React.ReactNode;
}) {
  const visible = slices.filter((s) => s.value > 0);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  return (
    <div>
      <div className="relative" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="label"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={visible.length > 1 ? 2 : 0}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {visible.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [String(value), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {center}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: slice.color }}
            />
            <span className="text-muted-foreground">{slice.label}</span>
            <span className="tabular-nums">
              {slice.value}
              {total > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  ({Math.round((slice.value * 100) / total)}%)
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
