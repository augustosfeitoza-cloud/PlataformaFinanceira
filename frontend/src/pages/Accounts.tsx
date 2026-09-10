import { FormEvent, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select } from "../components/ui";
import { Account } from "../types";
import { ACCOUNT_TYPE_LABEL, brlToCents, centsToBRL } from "../utils/format";

const emptyForm = {
  name: "",
  type: "CHECKING",
  institution: "",
  initialBalance: "0",
  creditLimit: "",
  closingDay: "",
  dueDay: "",
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<Account[]>("/accounts")
      .then((res) => setAccounts(res.data))
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
      await api.post("/accounts", {
        name: form.name,
        type: form.type,
        institution: form.institution || null,
        initialBalanceCents: brlToCents(form.initialBalance),
        creditLimitCents: form.creditLimit ? brlToCents(form.creditLimit) : null,
        closingDay: form.closingDay ? Number(form.closingDay) : null,
        dueDay: form.dueDay ? Number(form.dueDay) : null,
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
    if (!confirm("Remover esta conta? Se houver transações associadas, ela será apenas arquivada.")) return;
    await api.delete(`/accounts/${id}`);
    load();
  }

  const isCreditCard = form.type === "CREDIT_CARD";

  return (
    <div>
      <PageHeader
        title="Contas Financeiras"
        subtitle="Corrente, poupança, digital e cartão de crédito"
        action={<Button onClick={openNew}>Nova conta</Button>}
      />

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : accounts.length === 0 ? (
        <Card>
          <EmptyState message="Nenhuma conta cadastrada ainda." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <Card key={acc.id} className={acc.archived ? "opacity-50" : ""}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{acc.name}</p>
                  <p className="text-xs text-slate-500">{ACCOUNT_TYPE_LABEL[acc.type]}</p>
                  {acc.institution && <p className="text-xs text-slate-400">{acc.institution}</p>}
                </div>
                <button
                  onClick={() => handleDelete(acc.id)}
                  className="text-slate-300 hover:text-red-500 text-sm"
                  title="Remover"
                >
                  &times;
                </button>
              </div>
              <p className={`text-xl font-bold mt-3 ${acc.balanceCents < 0 ? "text-red-600" : "text-slate-900"}`}>
                {centsToBRL(acc.balanceCents)}
              </p>
              {acc.type === "CREDIT_CARD" && (
                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  {acc.creditLimitCents != null && <p>Limite: {centsToBRL(acc.creditLimitCents)}</p>}
                  {acc.closingDay && <p>Fechamento: dia {acc.closingDay}</p>}
                  {acc.dueDay && <p>Vencimento: dia {acc.dueDay}</p>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova conta">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Tipo">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Instituição">
            <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
          </Field>
          {!isCreditCard && (
            <Field label="Saldo inicial (R$)">
              <Input value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} />
            </Field>
          )}
          {isCreditCard && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Limite (R$)">
                <Input value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
              </Field>
              <Field label="Dia fechamento">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.closingDay}
                  onChange={(e) => setForm({ ...form, closingDay: e.target.value })}
                />
              </Field>
              <Field label="Dia vencimento">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dueDay}
                  onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
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
