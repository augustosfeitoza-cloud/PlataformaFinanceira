import { FormEvent, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api, extractErrorMessage } from "../api/client";
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select } from "../components/ui";
import { Investment } from "../types";
import { brlToCents, centsToBRL, formatDate, INVESTMENT_CLASS_LABEL, INVESTMENT_SUBTYPE_LABEL } from "../utils/format";

const PALETTE = ["#18b077", "#3ecb93", "#0f8f61"];

const emptyForm = {
  class: "FIXED_INCOME",
  subtype: "CDB",
  name: "",
  broker: "",
  investedAmount: "",
  currentAmount: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  maturityDate: "",
  rateInfo: "",
};

const SUBTYPES_BY_CLASS: Record<string, string[]> = {
  FIXED_INCOME: ["TESOURO_DIRETO", "CDB", "RDB", "LCI", "LCA", "OTHER"],
  VARIABLE_INCOME: ["STOCK", "FII", "ETF", "OTHER"],
  FUND: ["FUND", "OTHER"],
};

export default function Investments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<Investment[]>("/investments")
      .then((res) => setInvestments(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openNew() {
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/investments", {
        class: form.class,
        subtype: form.subtype,
        name: form.name,
        broker: form.broker || null,
        investedAmountCents: brlToCents(form.investedAmount),
        currentAmountCents: brlToCents(form.currentAmount || form.investedAmount),
        purchaseDate: form.purchaseDate,
        maturityDate: form.maturityDate || null,
        rateInfo: form.rateInfo || null,
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este investimento?")) return;
    await api.delete(`/investments/${id}`);
    load();
  }

  const byClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of investments) {
      map.set(inv.class, (map.get(inv.class) ?? 0) + inv.currentAmountCents);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name: INVESTMENT_CLASS_LABEL[name], value }));
  }, [investments]);

  const totals = useMemo(() => {
    const invested = investments.reduce((s, i) => s + i.investedAmountCents, 0);
    const current = investments.reduce((s, i) => s + i.currentAmountCents, 0);
    return { invested, current, gain: current - invested };
  }, [investments]);

  return (
    <div>
      <PageHeader
        title="Investimentos"
        subtitle="Renda fixa, renda variável e fundos"
        action={<Button onClick={openNew}>Novo investimento</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Total investido</p>
          <p className="text-xl font-bold mt-1">{centsToBRL(totals.invested)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Valor atual</p>
          <p className="text-xl font-bold mt-1">{centsToBRL(totals.current)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 uppercase">Rentabilidade</p>
          <p className={`text-xl font-bold mt-1 ${totals.gain >= 0 ? "text-brand-700" : "text-red-600"}`}>
            {centsToBRL(totals.gain)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className="font-semibold mb-4">Por classe</h3>
          {byClass.length === 0 ? (
            <EmptyState message="Nenhum investimento cadastrado." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byClass} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} isAnimationActive={false}>
                  {byClass.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => centsToBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Carteira</h3>
          {loading ? (
            <p className="text-slate-400">Carregando...</p>
          ) : investments.length === 0 ? (
            <EmptyState message="Nenhum investimento cadastrado ainda." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3 text-right">Investido</th>
                    <th className="py-2 pr-3 text-right">Atual</th>
                    <th className="py-2 pr-3">Compra</th>
                    <th className="py-2 pr-3" />
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3">
                        {inv.name}
                        {inv.rateInfo && <span className="text-xs text-slate-400 block">{inv.rateInfo}</span>}
                      </td>
                      <td className="py-2 pr-3">{INVESTMENT_SUBTYPE_LABEL[inv.subtype] ?? inv.subtype}</td>
                      <td className="py-2 pr-3 text-right">{centsToBRL(inv.investedAmountCents)}</td>
                      <td className="py-2 pr-3 text-right font-medium">{centsToBRL(inv.currentAmountCents)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDate(inv.purchaseDate)}</td>
                      <td className="py-2 pr-3 text-right">
                        <button onClick={() => handleDelete(inv.id)} className="text-slate-300 hover:text-red-500">
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo investimento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Classe">
              <Select
                value={form.class}
                onChange={(e) =>
                  setForm({ ...form, class: e.target.value, subtype: SUBTYPES_BY_CLASS[e.target.value][0] })
                }
              >
                {Object.entries(INVESTMENT_CLASS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subtipo">
              <Select value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })}>
                {SUBTYPES_BY_CLASS[form.class].map((s) => (
                  <option key={s} value={s}>
                    {INVESTMENT_SUBTYPE_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Corretora / Instituição">
            <Input value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor investido (R$)">
              <Input value={form.investedAmount} onChange={(e) => setForm({ ...form, investedAmount: e.target.value })} required />
            </Field>
            <Field label="Valor atual (R$)">
              <Input
                value={form.currentAmount}
                placeholder={form.investedAmount || "igual ao investido"}
                onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de compra">
              <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} required />
            </Field>
            <Field label="Vencimento">
              <Input type="date" value={form.maturityDate} onChange={(e) => setForm({ ...form, maturityDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Rentabilidade (ex: 110% CDI, IPCA + 6%)">
            <Input value={form.rateInfo} onChange={(e) => setForm({ ...form, rateInfo: e.target.value })} />
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
