import { FormEvent, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, extractErrorMessage } from "../api/client";
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select } from "../components/ui";
import { Category } from "../types";
import { centsToBRL, brlToCents, currentMonth } from "../utils/format";

interface BudgetRow {
  categoryId: string;
  categoryName: string;
  plannedCents: number;
  actualCents: number;
  differenceCents: number;
  percentUsed: number | null;
}

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ categoryId: "", plannedAmount: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<{ budgets: BudgetRow[] }>("/reports/budget-vs-actual", { params: { month } })
      .then((res) => setRows(res.data.budgets))
      .finally(() => setLoading(false));
  }

  useEffect(load, [month]);

  useEffect(() => {
    api.get<Category[]>("/categories", { params: { type: "EXPENSE" } }).then((res) => setCategories(res.data));
  }, []);

  function openNew() {
    setForm({ categoryId: categories[0]?.id ?? "", plannedAmount: "" });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/budgets", {
        categoryId: form.categoryId,
        month,
        plannedAmountCents: brlToCents(form.plannedAmount),
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const chartData = rows.map((r) => ({
    name: r.categoryName,
    Planejado: r.plannedCents / 100,
    Realizado: r.actualCents / 100,
  }));

  return (
    <div>
      <PageHeader
        title="Orçamento"
        subtitle="Planejado x realizado por categoria de despesa"
        action={<Button onClick={openNew}>Definir orçamento</Button>}
      />

      <Card className="mb-4">
        <Field label="Mês">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="max-w-xs" />
        </Field>
      </Card>

      <Card>
        {loading ? (
          <p className="text-slate-400">Carregando...</p>
        ) : rows.length === 0 ? (
          <EmptyState message="Nenhum orçamento definido para este mês." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Legend />
                <Bar dataKey="Planejado" fill="#94a3b8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Realizado" fill="#18b077" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>

            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3 text-right">Planejado</th>
                  <th className="py-2 pr-3 text-right">Realizado</th>
                  <th className="py-2 pr-3 text-right">Diferença</th>
                  <th className="py-2 pr-3 text-right">% usado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.categoryId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3">{r.categoryName}</td>
                    <td className="py-2 pr-3 text-right">{centsToBRL(r.plannedCents)}</td>
                    <td className="py-2 pr-3 text-right">{centsToBRL(r.actualCents)}</td>
                    <td className={`py-2 pr-3 text-right ${r.differenceCents < 0 ? "text-red-600" : "text-brand-700"}`}>
                      {centsToBRL(r.differenceCents)}
                    </td>
                    <td className="py-2 pr-3 text-right">{r.percentUsed != null ? `${r.percentUsed.toFixed(0)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Definir orçamento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Categoria">
            <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Valor planejado (R$)">
            <Input value={form.plannedAmount} onChange={(e) => setForm({ ...form, plannedAmount: e.target.value })} required />
          </Field>
          <ErrorText message={error} />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
