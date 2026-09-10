import { FormEvent, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader } from "../components/ui";
import { Goal } from "../types";
import { brlToCents, centsToBRL, formatDate } from "../utils/format";

const emptyForm = { name: "", targetAmount: "", currentAmount: "0", targetDate: "" };

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<Goal[]>("/goals")
      .then((res) => setGoals(res.data))
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
      await api.post("/goals", {
        name: form.name,
        targetAmountCents: brlToCents(form.targetAmount),
        currentAmountCents: brlToCents(form.currentAmount || "0"),
        targetDate: form.targetDate || null,
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
    if (!confirm("Remover esta meta?")) return;
    await api.delete(`/goals/${id}`);
    load();
  }

  async function handleUpdateProgress(goal: Goal) {
    const value = prompt("Novo valor acumulado (R$):", (goal.currentAmountCents / 100).toFixed(2));
    if (value == null) return;
    await api.put(`/goals/${goal.id}`, { currentAmountCents: brlToCents(value) });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Metas Financeiras"
        subtitle="Planeje e acompanhe o progresso rumo aos seus objetivos"
        action={<Button onClick={openNew}>Nova meta</Button>}
      />

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : goals.length === 0 ? (
        <Card>
          <EmptyState message="Nenhuma meta cadastrada ainda." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const percent = goal.targetAmountCents > 0 ? Math.min(100, (goal.currentAmountCents / goal.targetAmountCents) * 100) : 0;
            return (
              <Card key={goal.id}>
                <div className="flex items-start justify-between">
                  <p className="font-semibold">{goal.name}</p>
                  <button onClick={() => handleDelete(goal.id)} className="text-slate-300 hover:text-red-500 text-sm">
                    &times;
                  </button>
                </div>
                {goal.targetDate && <p className="text-xs text-slate-400">Até {formatDate(goal.targetDate)}</p>}
                <div className="mt-3">
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-brand-600 h-2.5 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="font-medium">{centsToBRL(goal.currentAmountCents)}</span>
                    <span className="text-slate-400">de {centsToBRL(goal.targetAmountCents)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleUpdateProgress(goal)}
                  className="text-xs text-brand-600 hover:underline mt-3"
                >
                  Atualizar valor acumulado
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova meta">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome da meta">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor alvo (R$)">
              <Input value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} required />
            </Field>
            <Field label="Já acumulado (R$)">
              <Input value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
            </Field>
          </div>
          <Field label="Data alvo">
            <Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
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
