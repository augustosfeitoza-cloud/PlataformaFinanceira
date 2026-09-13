import { FormEvent, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader } from "../components/ui";
import { ObligationDashboardItem } from "../types";
import {
  CLIENT_REGIME_LABEL,
  currentMonth,
  formatDateStr,
  monthLabel,
  OBLIGATION_STATUS_LABEL,
  shiftMonthStr,
} from "../utils/format";

const STATUS_STYLE: Record<string, string> = {
  DONE: "bg-green-50 text-green-700",
  LATE: "bg-red-50 text-red-600",
  PENDING: "bg-amber-50 text-amber-700",
};

export default function Obligations() {
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<ObligationDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<ObligationDashboardItem | null>(null);
  const [protocolNumber, setProtocolNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<ObligationDashboardItem[]>("/obligations/dashboard", { params: { month } })
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [month]);

  function openComplete(item: ObligationDashboardItem) {
    setCompleting(item);
    setProtocolNumber("");
    setNotes("");
    setError(null);
  }

  async function handleComplete(e: FormEvent) {
    e.preventDefault();
    if (!completing) return;
    setError(null);
    setSaving(true);
    try {
      await api.post("/obligations/complete", {
        clientObligationId: completing.clientObligationId,
        competence: completing.competence,
        protocolNumber: protocolNumber || null,
        notes: notes || null,
      });
      setCompleting(null);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleUndo(item: ObligationDashboardItem) {
    if (!item.completion) return;
    if (!confirm("Desfazer o envio desta obrigação?")) return;
    await api.delete(`/obligations/complete/${item.completion.id}`);
    load();
  }

  const pendingCount = items.filter((i) => i.status === "PENDING").length;
  const lateCount = items.filter((i) => i.status === "LATE").length;
  const doneCount = items.filter((i) => i.status === "DONE").length;

  return (
    <div>
      <PageHeader
        title="Obrigações"
        subtitle="Envios mensais e anuais de todos os clientes, por mês de vencimento"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setMonth(shiftMonthStr(month, -1))}>
              &larr;
            </Button>
            <span className="font-semibold capitalize w-32 text-center">{monthLabel(month)}</span>
            <Button variant="secondary" onClick={() => setMonth(shiftMonthStr(month, 1))}>
              &rarr;
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-slate-500 mt-1">Pendentes</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-red-600">{lateCount}</p>
          <p className="text-xs text-slate-500 mt-1">Atrasadas</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">{doneCount}</p>
          <p className="text-xs text-slate-500 mt-1">Enviadas</p>
        </Card>
      </div>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState message="Nenhuma obrigação com vencimento neste mês." />
        </Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Obrigação</th>
                <th className="p-4 font-medium">Competência</th>
                <th className="p-4 font-medium">Vencimento</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.clientObligationId + item.competence} className="border-b border-slate-100 last:border-0">
                  <td className="p-4">
                    <p className="font-medium">{item.clientName}</p>
                    <p className="text-xs text-slate-400">{CLIENT_REGIME_LABEL[item.clientRegime]}</p>
                  </td>
                  <td className="p-4">{item.obligationTypeName}</td>
                  <td className="p-4 text-slate-500">
                    {item.recurrence === "MONTHLY" ? monthLabel(item.competence) : item.competence}
                  </td>
                  <td className="p-4 text-slate-500">{formatDateStr(item.dueDate)}</td>
                  <td className="p-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[item.status]}`}>
                      {OBLIGATION_STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {item.status === "DONE" ? (
                      <button onClick={() => handleUndo(item)} className="text-slate-400 hover:text-red-500 text-xs">
                        Desfazer
                      </button>
                    ) : (
                      <Button onClick={() => openComplete(item)} className="text-xs py-1.5">
                        Marcar enviado
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!completing} onClose={() => setCompleting(null)} title="Marcar obrigação como enviada">
        <form onSubmit={handleComplete} className="space-y-4">
          {completing && (
            <p className="text-sm text-slate-500">
              {completing.obligationTypeName} · {completing.clientName} ·{" "}
              {completing.recurrence === "MONTHLY" ? monthLabel(completing.competence) : completing.competence}
            </p>
          )}
          <Field label="Nº do protocolo / recibo (opcional)">
            <Input value={protocolNumber} onChange={(e) => setProtocolNumber(e.target.value)} />
          </Field>
          <Field label="Observações (opcional)">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <ErrorText message={error} />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Confirmar envio"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
