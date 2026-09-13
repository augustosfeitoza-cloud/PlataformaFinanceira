import { FormEvent, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select } from "../components/ui";
import { Client } from "../types";
import { CLIENT_REGIME_LABEL } from "../utils/format";

const emptyForm = { name: "", document: "", regime: "SIMPLES_NACIONAL", notes: "" };

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [obligationsClient, setObligationsClient] = useState<Client | null>(null);

  function load() {
    setLoading(true);
    api
      .get<Client[]>("/clients")
      .then((res) => setClients(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name,
      document: client.document ?? "",
      regime: client.regime,
      notes: client.notes ?? "",
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
      document: form.document || null,
      regime: form.regime,
      notes: form.notes || null,
    };
    try {
      if (editing) {
        await api.put(`/clients/${editing.id}`, payload);
      } else {
        await api.post("/clients", payload);
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
    if (!confirm("Remover este cliente e todo o histórico de obrigações dele?")) return;
    await api.delete(`/clients/${id}`);
    load();
  }

  async function toggleActive(client: Client) {
    await api.put(`/clients/${client.id}`, { active: !client.active });
    load();
  }

  async function toggleObligation(clientObligationId: string, active: boolean) {
    await api.put(`/client-obligations/${clientObligationId}`, { active: !active });
    const res = await api.get<Client[]>("/clients");
    setClients(res.data);
    setObligationsClient(res.data.find((c) => c.id === obligationsClient?.id) ?? null);
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Empresas e MEIs atendidos, com as obrigações que cada um precisa cumprir"
        action={<Button onClick={openNew}>Novo cliente</Button>}
      />

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : clients.length === 0 ? (
        <Card>
          <EmptyState message="Nenhum cliente cadastrado ainda." />
        </Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Documento</th>
                <th className="p-4 font-medium">Regime</th>
                <th className="p-4 font-medium">Obrigações ativas</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-4 font-medium">{client.name}</td>
                  <td className="p-4 text-slate-500">{client.document || "—"}</td>
                  <td className="p-4">{CLIENT_REGIME_LABEL[client.regime]}</td>
                  <td className="p-4">
                    <button
                      onClick={() => setObligationsClient(client)}
                      className="text-brand-600 hover:underline"
                    >
                      {client.obligations.filter((o) => o.active).length} de {client.obligations.length}
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(client)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        client.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {client.active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button onClick={() => openEdit(client)} className="text-slate-500 hover:text-brand-600">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="text-slate-400 hover:text-red-500">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar cliente" : "Novo cliente"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome / Razão social">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CNPJ / CPF (MEI)">
              <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
            </Field>
            <Field label="Regime">
              <Select value={form.regime} onChange={(e) => setForm({ ...form, regime: e.target.value })}>
                <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                <option value="MEI">MEI</option>
              </Select>
            </Field>
          </div>
          <Field label="Observações">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <ErrorText message={error} />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!obligationsClient}
        onClose={() => setObligationsClient(null)}
        title={`Obrigações de ${obligationsClient?.name ?? ""}`}
      >
        <p className="text-sm text-slate-500 mb-4">
          Desative as obrigações que não se aplicam a este cliente. O histórico de envios já registrados é mantido.
        </p>
        <div className="space-y-2">
          {obligationsClient?.obligations.map((co) => (
            <label
              key={co.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200"
            >
              <span>
                {co.obligationType.name}
                <span className="text-xs text-slate-400 ml-2">
                  {co.obligationType.recurrence === "MONTHLY" ? "Mensal" : "Anual"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={co.active}
                onChange={() => toggleObligation(co.id, co.active)}
                className="h-4 w-4"
              />
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
