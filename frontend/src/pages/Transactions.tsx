import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import {
  Button,
  Card,
  EmptyState,
  ErrorText,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
} from "../components/ui";
import { Account, Category, Transaction } from "../types";
import {
  centsToBRL,
  brlToCents,
  currentMonth,
  formatDate,
  PAYMENT_METHOD_LABEL,
  RECURRENCE_LABEL,
} from "../utils/format";

const emptyForm = {
  type: "EXPENSE",
  accountId: "",
  categoryId: "",
  subcategoryId: "",
  description: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "PIX",
  recurrence: "NONE",
  installments: "1",
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth());
  const [typeFilter, setTypeFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    const params: Record<string, string> = { month };
    if (typeFilter) params.type = typeFilter;
    api
      .get<Transaction[]>("/transactions", { params })
      .then((res) => setTransactions(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [month, typeFilter]);

  useEffect(() => {
    api.get<Account[]>("/accounts").then((res) => setAccounts(res.data));
    api.get<Category[]>("/categories").then((res) => setCategories(res.data));
  }, []);

  const filteredCategories = categories.filter((c) => c.type === form.type);
  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const selectedAccount = accounts.find((a) => a.id === form.accountId);
  const isCreditCard = selectedAccount?.type === "CREDIT_CARD";

  function openNew() {
    setForm({ ...emptyForm, accountId: accounts[0]?.id ?? "" });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/transactions", {
        accountId: form.accountId,
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId || null,
        type: form.type,
        description: form.description,
        amountCents: brlToCents(form.amount),
        date: form.date,
        paymentMethod: form.paymentMethod,
        recurrence: form.recurrence,
        installments: isCreditCard ? Number(form.installments) : 1,
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: Transaction) {
    const isSeries = !!t.installmentGroupId;
    const deleteSeries = isSeries && confirm("Esta transação faz parte de uma série (parcelas/recorrência). Excluir todas as ocorrências?");
    await api.delete(`/transactions/${t.id}`, { params: deleteSeries ? { deleteSeries: "true" } : {} });
    load();
  }

  const totals = useMemo(() => {
    const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountCents, 0);
    const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);
    return { income, expense };
  }, [transactions]);

  return (
    <div>
      <PageHeader
        title="Transações"
        subtitle="Receitas e despesas com categoria, forma de pagamento e recorrência"
        action={<Button onClick={openNew}>Nova transação</Button>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <Field label="Mês">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="INCOME">Receitas</option>
              <option value="EXPENSE">Despesas</option>
            </Select>
          </Field>
          <div className="ml-auto flex gap-6 text-sm">
            <div>
              <p className="text-slate-500">Receitas</p>
              <p className="font-bold text-brand-700">{centsToBRL(totals.income)}</p>
            </div>
            <div>
              <p className="text-slate-500">Despesas</p>
              <p className="font-bold text-red-600">{centsToBRL(totals.expense)}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <p className="text-slate-400">Carregando...</p>
        ) : transactions.length === 0 ? (
          <EmptyState message="Nenhuma transação neste período." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Descrição</th>
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3">Conta</th>
                  <th className="py-2 pr-3">Pagamento</th>
                  <th className="py-2 pr-3 text-right">Valor</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="py-2 pr-3">
                      {t.description}
                      {t.installmentTotal && t.installmentTotal > 1 && (
                        <span className="text-xs text-slate-400 ml-1">
                          ({t.installmentNumber}/{t.installmentTotal})
                        </span>
                      )}
                      {t.recurrence !== "NONE" && (
                        <span className="text-xs text-slate-400 ml-1">· {RECURRENCE_LABEL[t.recurrence]}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {t.category?.name}
                      {t.subcategory && <span className="text-slate-400"> / {t.subcategory.name}</span>}
                    </td>
                    <td className="py-2 pr-3">{t.account?.name}</td>
                    <td className="py-2 pr-3">{PAYMENT_METHOD_LABEL[t.paymentMethod]}</td>
                    <td className={`py-2 pr-3 text-right font-medium ${t.type === "INCOME" ? "text-brand-700" : "text-red-600"}`}>
                      {t.type === "INCOME" ? "+" : "-"}
                      {centsToBRL(t.amountCents)}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <button onClick={() => handleDelete(t)} className="text-slate-300 hover:text-red-500">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova transação">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Tipo">
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value, categoryId: "", subcategoryId: "" })}
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </Select>
          </Field>
          <Field label="Descrição">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </Field>
            <Field label="Data">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </Field>
          </div>
          <Field label="Conta">
            <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} required>
              <option value="">Selecione...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <Select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: "" })}
                required
              >
                <option value="">Selecione...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subcategoria">
              <Select value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}>
                <option value="">Nenhuma</option>
                {selectedCategory?.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Forma de pagamento">
            <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {isCreditCard ? (
            <Field label="Parcelas">
              <Input
                type="number"
                min={1}
                max={60}
                value={form.installments}
                onChange={(e) => setForm({ ...form, installments: e.target.value })}
              />
            </Field>
          ) : (
            <Field label="Recorrência">
              <Select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
                {Object.entries(RECURRENCE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
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
