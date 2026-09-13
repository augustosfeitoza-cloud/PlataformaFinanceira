import { FormEvent, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select } from "../components/ui";
import { ObligationType } from "../types";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const emptyForm = {
  name: "",
  recurrence: "MONTHLY",
  dueDay: "20",
  dueMonthOffset: "1",
  dueMonth: "1",
};

export default function ObligationTypes() {
  const [types, setTypes] = useState<ObligationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ObligationType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<ObligationType[]>("/obligation-types")
      .then((res) => setTypes(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(type: ObligationType) {
    setEditing(type);
    setForm({
      name: type.name,
      recurrence: type.recurrence,
      dueDay: String(type.dueDay),
      dueMonthOffset: String(type.dueMonthOffset),
      dueMonth: String(type.dueMonth ?? 1),
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload = {
      name: form.name,
      recurrence: form.recurrence,
      dueDay: Number(form.dueDay),
      dueMonthOffset: form.recurrence === "MONTHLY" ? Number(form.dueMonthOffset) : 0,
      dueMonth: form.recurrence === "ANNUAL" ? Number(form.dueMonth) : null,
    };
    try {
      if (editing) {
        await api.put(`/obligation-types/${editing.id}`, payload);
      } else {
        await api.post("/obligation-types", payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este tipo de obrigação de todos os clientes e apagar o histórico dele?")) return;
    await api.delete(`/obligation-types/${id}`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Tipos de Obrigação"
        subtitle="Catálogo de obrigações (mensais e anuais) aplicado automaticamente a novos clientes"
        action={<Button onClick={openNew}>Nova obrigação</Button>}
      />

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : types.length === 0 ? (
        <Card>
          <EmptyState message="Nenhum tipo de obrigação cadastrado." />
        </Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="p-4 font-medium">Nome</th>
                <th className="p-4 font-medium">Periodicidade</th>
                <th className="p-4 font-medium">Vencimento</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-4 font-medium">{type.name}</td>
                  <td className="p-4">{type.recurrence === "MONTHLY" ? "Mensal" : "Anual"}</td>
                  <td className="p-4 text-slate-500">
                    {type.recurrence === "MONTHLY"
                      ? `Dia ${type.dueDay} do mês ${type.dueMonthOffset === 0 ? "de competência" : "seguinte"}`
                      : `${MONTHS[(type.dueMonth ?? 1) - 1]}, dia ${type.dueDay}`}
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button onClick={() => openEdit(type)} className="text-slate-500 hover:text-brand-600">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(type.id)} className="text-slate-400 hover:text-red-500">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar obrigação" : "Nova obrigação"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Periodicidade">
            <Select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
              <option value="MONTHLY">Mensal</option>
              <option value="ANNUAL">Anual</option>
            </Select>
          </Field>
          {form.recurrence === "MONTHLY" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dia do vencimento">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dueDay}
                  onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                  required
                />
              </Field>
              <Field label="Vence no mês">
                <Select
                  value={form.dueMonthOffset}
                  onChange={(e) => setForm({ ...form, dueMonthOffset: e.target.value })}
                >
                  <option value="1">Seguinte à competência</option>
                  <option value="0">Da própria competência</option>
                </Select>
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mês de vencimento">
                <Select value={form.dueMonth} onChange={(e) => setForm({ ...form, dueMonth: e.target.value })}>
                  {MONTHS.map((label, idx) => (
                    <option key={idx} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Dia do vencimento">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dueDay}
                  onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                  required
                />
              </Field>
            </div>
          )}
          <ErrorText message={error} />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
