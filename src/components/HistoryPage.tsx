import React, { useState, useEffect } from "react";
import { db } from "../lib/db";
import { Person, Dose } from "../types";
import { Search, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function HistoryPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [filterAntibiotic, setFilterAntibiotic] = useState(false);
  const [history, setHistory] = useState<Dose[]>([]);

  const [doseToDelete, setDoseToDelete] = useState<string | null>(null);

  useEffect(() => {
    db.people.getAll().then(setPeople);
  }, []);

  useEffect(() => {
    if (selectedPersonId) {
      loadHistory(selectedPersonId);
    } else {
      setHistory([]);
    }
  }, [selectedPersonId, filterAntibiotic]);

  async function loadHistory(personId: string) {
    const doses = await db.doses.getAll();
    let personDoses = doses.filter(
      (d) => d.personId === personId && d.status !== "pending",
    );

    if (filterAntibiotic) {
      personDoses = personDoses.filter((d) => d.isAntibiotic);
    }

    personDoses.sort((a, b) => b.scheduledTime - a.scheduledTime);
    setHistory(personDoses);
  }

  async function confirmDeleteDose() {
    if (doseToDelete) {
      await db.doses.delete(doseToDelete);
      setDoseToDelete(null);
      if (selectedPersonId) {
        loadHistory(selectedPersonId);
      }
    }
  }

  async function handleToggleStatus(dose: Dose) {
    const newStatus = dose.status === "taken" ? "skipped" : "taken";
    const updateData: Partial<Dose> = { status: newStatus };

    if (newStatus === "taken") {
      updateData.takenAt = Date.now();
    } else {
      updateData.takenAt = undefined;
    }

    await db.doses.update(dose.id, updateData);
    if (selectedPersonId) {
      loadHistory(selectedPersonId);
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full pb-24">
      <h1 className="text-2xl font-bold mb-6">Histórico</h1>

      <div className="bg-app-surface rounded-2xl shadow-sm border border-app-border p-4 mb-6 transition-colors">
        <label className="block text-sm font-medium text-app-text mb-2">
          Selecione a pessoa
        </label>
        <select
          value={selectedPersonId}
          onChange={(e) => setSelectedPersonId(e.target.value)}
          className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-app-primary transition-colors text-app-text"
        >
          <option value="">Todas as pessoas...</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {selectedPersonId && (
          <label className="flex items-center gap-3 mt-4 pt-4 border-t border-app-border cursor-pointer">
            <input
              type="checkbox"
              checked={filterAntibiotic}
              onChange={(e) => setFilterAntibiotic(e.target.checked)}
              className="w-5 h-5 rounded text-app-primary focus:ring-app-primary bg-app-bg border-app-border cursor-pointer"
            />
            <span className="text-sm font-medium text-app-text select-none">
              Mostrar somente antibióticos
            </span>
          </label>
        )}
      </div>

      <div className="space-y-4">
        {!selectedPersonId ? (
          <div className="text-center py-12 text-app-muted">
            <Search size={48} className="mx-auto mb-3 opacity-20" />
            <p>Selecione uma pessoa para ver o histórico</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            <Clock size={48} className="mx-auto mb-3 opacity-20" />
            <p>Nenhum histórico registrado.</p>
          </div>
        ) : (
          history.map((dose) => (
            <div
              key={dose.id}
              className="bg-app-surface p-4 rounded-2xl shadow-sm border border-app-border transition-colors flex flex-col"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-app-text flex items-center gap-2">
                    {dose.medicationName}
                    {dose.isAntibiotic && (
                      <span className="text-[10px] uppercase font-bold bg-app-primary/10 text-app-primary px-2 py-0.5 rounded-full">
                        Antibiótico
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-app-muted">
                    Agendado:{" "}
                    {format(dose.scheduledTime, "dd/MM 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleStatus(dose)}
                    className="p-1 rounded-full hover:bg-app-bg transition-colors"
                    title={
                      dose.status === "taken"
                        ? "Marcar como pulado"
                        : "Marcar como tomado"
                    }
                  >
                    {dose.status === "taken" ? (
                      <CheckCircle2 className="text-app-success" size={24} />
                    ) : (
                      <XCircle className="text-app-danger" size={24} />
                    )}
                  </button>
                  <button
                    onClick={() => setDoseToDelete(dose.id)}
                    className="p-1.5 text-app-muted hover:text-app-danger transition-colors bg-app-bg rounded-lg border border-app-border"
                    title="Excluir registro"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {dose.status === "taken" && dose.takenAt && (
                <div className="mt-3 pt-3 border-t border-app-border">
                  <p className="text-xs text-app-success font-medium">
                    Tomado em:{" "}
                    {format(dose.takenAt, "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {doseToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-app-surface rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-app-border">
            <h3 className="text-lg font-bold mb-4 text-app-text">
              Excluir registro
            </h3>
            <p className="text-app-muted mb-6">
              Tem certeza que deseja excluir este registro do histórico?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDoseToDelete(null)}
                className="flex-1 px-4 py-3 bg-app-input text-app-text rounded-xl font-medium hover:bg-opacity-80 transition-colors border border-app-border"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteDose}
                className="flex-1 px-4 py-3 bg-app-danger-bg text-app-danger rounded-xl font-bold hover:opacity-80 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
