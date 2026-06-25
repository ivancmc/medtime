import React, { useState, useEffect } from "react";
import { db } from "../lib/db";
import { Person } from "../types";
import { format, addDays, addHours } from "date-fns";

export function AddPage({ onAdded }: { onAdded: () => void }) {
  const [people, setPeople] = useState<Person[]>([]);

  // Form states
  const [medPersonId, setMedPersonId] = useState("");
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreqHours, setMedFreqHours] = useState("8");
  const [medDurationDays, setMedDurationDays] = useState("");
  const [medIsAntibiotic, setMedIsAntibiotic] = useState(false);
  const [medStartDate, setMedStartDate] = useState(
    format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  );

  useEffect(() => {
    db.people.getAll().then(setPeople);
  }, []);

  async function handleAddMedication(e: React.FormEvent) {
    e.preventDefault();
    if (!medPersonId || !medName || !medFreqHours || !medDurationDays) return;

    const startTimestamp = new Date(medStartDate).getTime();
    const freqHours = parseInt(medFreqHours);
    const durationDays = parseInt(medDurationDays);

    const med = await db.medications.add({
      personId: medPersonId,
      name: medName,
      dosage: medDosage,
      frequencyHours: freqHours,
      durationDays: durationDays,
      startDate: startTimestamp,
      createdAt: Date.now(),
      isAntibiotic: medIsAntibiotic,
    });

    const totalDoses = Math.floor((durationDays * 24) / freqHours);
    let currentDoseTime = startTimestamp;

    for (let i = 0; i < totalDoses; i++) {
      await db.doses.add({
        personId: medPersonId,
        medicationId: med.id,
        medicationName: medName,
        scheduledTime: currentDoseTime,
        status: "pending",
        isAntibiotic: medIsAntibiotic,
      });
      currentDoseTime = addHours(
        new Date(currentDoseTime),
        freqHours,
      ).getTime();
    }

    onAdded();
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full pb-24">
      <h1 className="text-2xl font-bold mb-6">Novo Lembrete</h1>

      <form onSubmit={handleAddMedication} className="space-y-4">
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
          {people.length === 0 && (
            <p className="text-xs text-app-danger mt-1">
              Cadastre uma pessoa primeiro na aba Pessoas.
            </p>
          )}
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
            Primeira Dose
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

        <button
          type="submit"
          disabled={!medPersonId || !medName}
          className="w-full bg-app-primary-solid text-app-primary-solid-text font-semibold py-4 rounded-xl mt-4 disabled:opacity-50 transition-opacity"
        >
          Criar Lembrete
        </button>
      </form>
    </div>
  );
}
