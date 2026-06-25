import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { db } from "../lib/db";
import { Person, Medication } from "../types";
import { format, addDays, addHours } from "date-fns";
import { X, Trash2 } from "lucide-react";

export function EditMedicationModal({
  medicationId,
  onClose,
  onUpdated,
}: {
  medicationId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [med, setMed] = useState<Medication | null>(null);

  const [medPersonId, setMedPersonId] = useState("");
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreqHours, setMedFreqHours] = useState("");
  const [medDurationDays, setMedDurationDays] = useState("");
  const [medIsAntibiotic, setMedIsAntibiotic] = useState(false);
  const [medStartDate, setMedStartDate] = useState("");

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    db.people.getAll().then(setPeople);
    db.medications.getById(medicationId).then((m) => {
      if (m) {
        setMed(m);
        setMedPersonId(m.personId);
        setMedName(m.name);
        setMedDosage(m.dosage);
        setMedFreqHours(m.frequencyHours.toString());
        setMedDurationDays(m.durationDays?.toString() || "");
        setMedIsAntibiotic(m.isAntibiotic || false);
        setMedStartDate(format(m.startDate, "yyyy-MM-dd'T'HH:mm"));
      }
    });
  }, [medicationId]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!medPersonId || !medName || !medFreqHours || !medDurationDays) return;

    const startTimestamp = new Date(medStartDate).getTime();
    const freqHours = parseInt(medFreqHours);
    const durationDays = parseInt(medDurationDays);

    await db.medications.update(medicationId, {
      personId: medPersonId,
      name: medName,
      dosage: medDosage,
      frequencyHours: freqHours,
      durationDays: durationDays,
      startDate: startTimestamp,
      isAntibiotic: medIsAntibiotic,
    });

    const allDoses = await db.doses.getAll();
    const medDoses = allDoses.filter((d) => d.medicationId === medicationId);

    const now = Date.now();

    for (const d of medDoses) {
      if (d.status === "pending") {
        await db.doses.delete(d.id);
      } else {
        if (
          d.medicationName !== medName ||
          d.isAntibiotic !== medIsAntibiotic
        ) {
          await db.doses.update(d.id, {
            medicationName: medName,
            isAntibiotic: medIsAntibiotic,
          });
        }
      }
    }

    const totalDoses = Math.floor((durationDays * 24) / freqHours);
    let currentDoseTime = startTimestamp;

    // Recreate pending doses for the future
    for (let i = 0; i < totalDoses; i++) {
      const existingNonPending = medDoses.find(
        (d) => d.status !== "pending" && d.scheduledTime === currentDoseTime,
      );

      // Include doses from the past hour so the user doesn't miss recent pending ones
      if (!existingNonPending && currentDoseTime >= now - 60 * 60 * 1000) {
        await db.doses.add({
          personId: medPersonId,
          medicationId: medicationId,
          medicationName: medName,
          scheduledTime: currentDoseTime,
          status: "pending",
          isAntibiotic: medIsAntibiotic,
        });
      }
      currentDoseTime = addHours(
        new Date(currentDoseTime),
        freqHours,
      ).getTime();
    }

    onUpdated();
  }

  async function handleDelete() {
    await db.medications.delete(medicationId);
    const allDoses = await db.doses.getAll();
    for (const d of allDoses) {
      if (d.medicationId === medicationId) {
        await db.doses.delete(d.id);
      }
    }
    onUpdated();
  }

  if (!med) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-app-surface rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-app-border overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-app-muted hover:text-app-text bg-app-bg rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-6 text-app-text">
          Editar Lembrete
        </h2>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Para quem?
            </label>
            <select
              required
              value={medPersonId}
              onChange={(e) => setMedPersonId(e.target.value)}
              className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-app-primary transition-colors text-app-text"
            >
              <option value="">Selecione uma pessoa...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Medicamento
            </label>
            <input
              required
              type="text"
              placeholder="Ex: Amoxicilina"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-app-primary transition-colors text-app-text"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-app-text mb-1">
                Intervalo (h)
              </label>
              <input
                required
                type="number"
                min="1"
                placeholder="Ex: 8"
                value={medFreqHours}
                onChange={(e) => setMedFreqHours(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-app-primary transition-colors text-app-text"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-app-text mb-1">
                Duração (dias)
              </label>
              <input
                required
                type="number"
                min="1"
                placeholder="Ex: 3"
                value={medDurationDays}
                onChange={(e) => setMedDurationDays(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-app-primary transition-colors text-app-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Dosagem (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: 1 comp"
              value={medDosage}
              onChange={(e) => setMedDosage(e.target.value)}
              className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-app-primary transition-colors text-app-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Início (primeira dose)
            </label>
            <input
              required
              type="datetime-local"
              value={medStartDate}
              onChange={(e) => setMedStartDate(e.target.value)}
              className="w-full bg-app-input border border-app-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-app-primary transition-colors text-app-text"
            />
          </div>

          <label className="flex items-center gap-3 p-4 border border-app-border rounded-xl bg-app-input cursor-pointer">
            <input
              type="checkbox"
              checked={medIsAntibiotic}
              onChange={(e) => setMedIsAntibiotic(e.target.checked)}
              className="w-5 h-5 rounded text-app-primary focus:ring-app-primary bg-app-bg border-app-border cursor-pointer"
            />
            <span className="text-app-text font-medium select-none">
              É um antibiótico?
            </span>
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center justify-center gap-2 px-4 py-4 bg-app-danger-bg text-app-danger rounded-xl font-semibold hover:opacity-80 transition-opacity"
              title="Excluir tudo"
            >
              <Trash2 size={20} />
            </button>
            <button
              type="submit"
              disabled={!medPersonId || !medName}
              className="flex-1 bg-app-primary-solid text-app-primary-solid-text font-semibold py-4 rounded-xl disabled:opacity-50 transition-opacity"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-app-surface rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-app-border">
            <h3 className="text-lg font-bold mb-4 text-app-text">
              Excluir Lembrete
            </h3>
            <p className="text-app-muted mb-6">
              Tem certeza que deseja excluir todos os lembretes deste
              medicamento (passados e futuros)?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 px-4 py-3 bg-app-input text-app-text rounded-xl font-medium hover:bg-opacity-80 transition-colors border border-app-border"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-app-danger-bg text-app-danger rounded-xl font-bold hover:opacity-80 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
