import React, { useState, useEffect } from "react";
import { db } from "../lib/db";
import { Person } from "../types";
import { format, addHours } from "date-fns";
import { getOrCreatePushSubscription, registerPushTriggers } from "../lib/push";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ToastVariant } from "./Toast";

type PushStatus = "idle" | "loading" | "success" | "error";

export function AddPage({
  onAdded,
  onToast,
}: {
  onAdded: () => void;
  onToast?: (message: string, variant: ToastVariant) => void;
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [pushStatus, setPushStatus] = useState<PushStatus>("idle");
  const [pushMessage, setPushMessage] = useState("");

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

    // ── 1. Persist medication to local IndexedDB ──────────────────────────
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
    const timestamps: number[] = [];
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
      timestamps.push(currentDoseTime);
      currentDoseTime = addHours(new Date(currentDoseTime), freqHours).getTime();
    }

    // ── 2. Register push triggers in Supabase (non-blocking for UX) ────────
    void schedulePushTriggers(timestamps);

    onAdded();
  }

  /**
   * Requests notification permission, gets/creates VAPID subscription,
   * then inserts one push_trigger row per future timestamp in Supabase.
   * Only future timestamps are sent — no medication names leave the device.
   */
  async function schedulePushTriggers(timestamps: number[]) {
    setPushStatus("loading");

    try {
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") {
          setPushStatus("error");
          const msg = "Permissão de notificação negada. Os lembretes não serão enviados.";
          setPushMessage(msg);
          onToast?.(msg, "error");
          return;
        }
      }

      if (Notification.permission === "denied") {
        setPushStatus("error");
        const msg = "Notificações bloqueadas. Habilite-as nas configurações do navegador.";
        setPushMessage(msg);
        onToast?.(msg, "error");
        return;
      }

      const subscription = await getOrCreatePushSubscription();
      if (!subscription) {
        setPushStatus("error");
        const msg = "Este navegador não suporta Push Notifications.";
        setPushMessage(msg);
        onToast?.(msg, "error");
        return;
      }

      await registerPushTriggers(subscription, timestamps);

      setPushStatus("success");
      setPushMessage(`${timestamps.filter((t) => t > Date.now()).length} lembretes agendados!`);
    } catch (err) {
      console.error("[MedTime] Push scheduling failed:", err);
      setPushStatus("error");
      const msg = "Falha ao agendar notificações. O lembrete foi salvo localmente.";
      setPushMessage(msg);
      onToast?.(msg, "error");
    }
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

      {/* Push scheduling feedback — only show loading/success inline */}
      {pushStatus !== "idle" && pushStatus !== "error" && (
        <div
          className={`mt-4 flex items-start gap-3 p-4 rounded-xl text-sm border transition-all ${
            pushStatus === "success"
              ? "bg-app-success-bg border-app-success/30 text-app-success"
              : "bg-app-primary-bg border-app-primary/20 text-app-primary"
          }`}
        >
          {pushStatus === "loading" && (
            <Loader2 size={18} className="shrink-0 animate-spin mt-0.5" />
          )}
          {pushStatus === "success" && (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          )}
          <span>
            {pushStatus === "loading"
              ? "Agendando notificações push..."
              : pushMessage}
          </span>
        </div>
      )}
    </div>
  );
}
