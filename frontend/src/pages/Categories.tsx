import { FormEvent, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { Button, Card, ErrorText, Field, Input, Modal, PageHeader, Select } from "../components/ui";
import { Category } from "../types";
import { EXPENSE_KIND_LABEL } from "../utils/format";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "EXPENSE", expenseKind: "ESSENTIAL" });
  const [subForms, setSubForms] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    api
      .get<Category[]>("/categories")
      .then((res) => setCategories(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/categories", {
        name: form.name,
        type: form.type,
        expenseKind: form.type === "EXPENSE" ? form.expenseKind : null,
      });
      setModalOpen(false);
      setForm({ name: "", type: "EXPENSE", expenseKind: "ESSENTIAL" });
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    try {
      await api.delete(`/categories/${id}`);
      load();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  }

  async function handleAddSubcategory(categoryId: string) {
    const name = subForms[categoryId]?.trim();
    if (!name) return;
    await api.post(`/categories/${categoryId}/subcategories`, { name });
    setSubForms({ ...subForms, [categoryId]: "" });
    load();
  }

  async function handleDeleteSubcategory(subId: string) {
    await api.delete(`/categories/subcategories/${subId}`);
    load();
  }

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  function renderCategory(cat: Category) {
    return (
      <Card key={cat.id}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold">{cat.name}</p>
            {cat.expenseKind && (
              <p className="text-xs text-slate-500">{EXPENSE_KIND_LABEL[cat.expenseKind]}</p>
            )}
          </div>
          {!cat.isDefault && (
            <button
              onClick={() => handleDeleteCategory(cat.id)}
              className="text-slate-300 hover:text-red-500 text-sm"
            >
              &times;
            </button>
          )}
        </div>
        <ul className="mt-3 space-y-1">
          {cat.subcategories.map((sub) => (
            <li key={sub.id} className="flex items-center justify-between text-sm text-slate-600">
              <span>{sub.name}</span>
              <button onClick={() => handleDeleteSubcategory(sub.id)} className="text-slate-300 hover:text-red-500">
                &times;
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-3">
          <Input
            placeholder="Nova subcategoria"
            value={subForms[cat.id] ?? ""}
            onChange={(e) => setSubForms({ ...subForms, [cat.id]: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAddSubcategory(cat.id)}
          />
          <Button variant="secondary" onClick={() => handleAddSubcategory(cat.id)} type="button">
            +
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Organize receitas e despesas por categoria e subcategoria"
        action={<Button onClick={() => setModalOpen(true)}>Nova categoria</Button>}
      />

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="font-semibold text-slate-700 mb-3">Receitas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomeCategories.map(renderCategory)}
            </div>
          </section>
          <section>
            <h3 className="font-semibold text-slate-700 mb-3">Despesas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expenseCategories.map(renderCategory)}
            </div>
          </section>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova categoria">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Tipo">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </Select>
          </Field>
          {form.type === "EXPENSE" && (
            <Field label="Classificação">
              <Select value={form.expenseKind} onChange={(e) => setForm({ ...form, expenseKind: e.target.value })}>
                {Object.entries(EXPENSE_KIND_LABEL).map(([value, label]) => (
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
