'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { statusColor } from './ui';

const PALETTE = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#dc2626', '#0891b2', '#9ca3af'];

export interface Slice {
  name: string;
  value: number;
}

/** Dona de distribución (ej. cargos por estado). */
export function DonutChart({ data }: { data: Slice[] }) {
  if (data.length === 0) {
    return <Empty />;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={statusColor(d.name)} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Barras (ej. mantenimiento por estado). */
export function StatusBarChart({ data }: { data: Slice[] }) {
  if (data.length === 0) {
    return <Empty />;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={statusColor(d.name)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Dona con paleta fija (para categorías que no son estados). */
export function CategoryDonut({ data }: { data: Slice[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export interface SeriesPoint {
  label: string;
  income: number;
  expenses: number;
}

/** Líneas de ingresos vs gastos por mes. */
export function IncomeExpenseChart({ data }: { data: SeriesPoint[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="income" name="Ingresos" stroke="#16a34a" strokeWidth={2} />
        <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#dc2626" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return (
    <div
      style={{
        height: 240,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--muted)',
      }}
    >
      Sin datos para mostrar.
    </div>
  );
}
