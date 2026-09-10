import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { Card, PageHeader, EmptyState } from "../components/ui";
import { centsToBRL, currentMonth, EXPENSE_KIND_LABEL, monthLabel } from "../utils/format";

const PALETTE = ["#18b077", "#3ecb93", "#0f8f61", "#77e2b4", "#0f7250", "#aef0d1", "#115b42"];

interface Summary {
  month: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  committedPercent: number | null;
}

interface CategorySlice {
  categoryId: string;
  name: string;
  expenseKind: string | null;
  amountCents: number;
  percent: number;
}

interface NetWorthPoint {
  month: string;
  accountsCents: number;
  investmentsCents: number;
  totalCents: number;
}

export default function Dashboard() {
  const month = currentMonth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<CategorySlice[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Summary>("/reports/summary", { params: { month } }),
      api.get<{ categories: CategorySlice[] }>("/reports/by-category", { params: { month } }),
      api.get<NetWorthPoint[]>("/reports/net-worth", { params: { months: 6 } }),
    ])
      .then(([summaryRes, catRes, netWorthRes]) => {
        setSummary(summaryRes.data);
        setCategories(catRes.data.categories);
        setNetWorth(netWorthRes.data);
      })
      .finally(() => setLoading(false));
  }, [month]);

  if (loading) return <p className="text-slate-400">Carregando dashboard...</p>;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Visão geral de ${monthLabel(month)}`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Receitas do mês</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{centsToBRL(summary?.incomeCents ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Despesas do mês</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{centsToBRL(summary?.expenseCents ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Saldo do mês</p>
          <p className={`text-2xl font-bold mt-1 ${(summary?.balanceCents ?? 0) >= 0 ? "text-slate-900" : "text-red-600"}`}>
            {centsToBRL(summary?.balanceCents ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Renda comprometida</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {summary?.committedPercent != null ? `${summary.committedPercent.toFixed(1)}%` : "—"}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-4">Despesas por categoria</h3>
          {categories.length === 0 ? (
            <EmptyState message="Nenhuma despesa registrada neste mês." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="amountCents"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {categories.map((c, i) => (
                    <Cell key={c.categoryId} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => centsToBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <ul className="mt-2 space-y-1">
            {categories.map((c, i) => (
              <li key={c.categoryId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  {c.name}
                  {c.expenseKind && (
                    <span className="text-xs text-slate-400">({EXPENSE_KIND_LABEL[c.expenseKind]})</span>
                  )}
                </span>
                <span className="text-slate-600">
                  {centsToBRL(c.amountCents)} · {c.percent.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Evolução patrimonial (6 meses)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={netWorth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => centsToBRL(v).replace(",00", "")} width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => centsToBRL(v)} labelFormatter={monthLabel} />
              <Line type="monotone" dataKey="totalCents" name="Patrimônio total" stroke="#18b077" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="accountsCents" name="Contas" stroke="#0f7250" strokeWidth={1.5} dot={false} strokeDasharray="4 3" isAnimationActive={false} />
              <Line type="monotone" dataKey="investmentsCents" name="Investimentos" stroke="#3ecb93" strokeWidth={1.5} dot={false} strokeDasharray="4 3" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="font-semibold mb-4">Receitas x Despesas x Saldo</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={[
              {
                month,
                Receitas: summary?.incomeCents ?? 0,
                Despesas: summary?.expenseCents ?? 0,
                Saldo: summary?.balanceCents ?? 0,
              },
            ]}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tickFormatter={(v) => centsToBRL(v).replace(",00", "")} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="month" tickFormatter={monthLabel} hide />
            <Tooltip formatter={(v: number) => centsToBRL(v)} />
            <Bar dataKey="Receitas" fill="#18b077" radius={[4, 4, 4, 4]} isAnimationActive={false} />
            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 4, 4]} isAnimationActive={false} />
            <Bar dataKey="Saldo" fill="#0f7250" radius={[4, 4, 4, 4]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
