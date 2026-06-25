import React, { useState, useEffect } from "react";
import { db } from "../lib/db";
import { Person, Medication, Dose } from "../types";
import {
  Plus,
  Check,
  X,
  Bell,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  format,
  isSameDay,
  startOfDay,
  addDays,
  subDays,
  addHours,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { EditMedicationModal } from "./EditMedicationModal";

export function TodayPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [todayDoses, setTodayDoses] = useState<
    (Dose & { personName: string; dosage?: string })[]
  >([]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    loadData();

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Check for pending doses every minute
    const interval = setInterval(() => {
      checkNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  async function checkNotifications() {
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;

    const d = await db.doses.getAll();
    const p = await db.people.getAll();
    const now = Date.now();
    // find doses scheduled in the last 5 minutes that are still pending
    const recentPending = d.filter(
      (dose) =>
        dose.status === "pending" &&
        now >= dose.scheduledTime &&
        now - dose.scheduledTime < 5 * 60 * 1000,
    );

    recentPending.forEach((dose) => {
      const person = p.find((person) => person.id === dose.personId);
      const personName = person ? person.name : "Alguém";

      // Check if we already notified for this dose in localStorage to prevent spam
      const notifiedKey = `notified_${dose.id}`;
      if (!localStorage.getItem(notifiedKey)) {
        const notificationTitle = "Hora do Remédio!";
        const notificationOptions = {
          body: `É hora de dar ${dose.medicationName} para ${personName}.`,
          icon: "https://api.dicebear.com/7.x/identicon/svg?seed=medminder",
          badge: "https://api.dicebear.com/7.x/identicon/svg?seed=medminder",
          vibrate: [200, 100, 200],
          data: { url: "/" },
        };

        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(notificationTitle, notificationOptions);
          });
        } else if ("Notification" in window) {
          new Notification(notificationTitle, notificationOptions);
        }
        localStorage.setItem(notifiedKey, "true");
      }
    });
  }

  async function loadData() {
    const p = await db.people.getAll();
    setPeople(p);

    const m = await db.medications.getAll();

    const d = await db.doses.getAll();
    const currentDay = startOfDay(selectedDate);

    const todayDosesData = d
      .filter((dose) => isSameDay(new Date(dose.scheduledTime), currentDay))
      .map((dose) => {
        const person = p.find((person) => person.id === dose.personId);
        const med = m.find((med) => med.id === dose.medicationId);
        return {
          ...dose,
          personName: person ? person.name : "Desconhecido",
          dosage: med?.dosage,
        };
      })
      .sort((a, b) => a.scheduledTime - b.scheduledTime);

    setTodayDoses(todayDosesData);
  }

  async function handleDoseAction(doseId: string, action: "taken" | "skipped") {
    await db.doses.update(doseId, {
      status: action,
      takenAt: action === "taken" ? Date.now() : null,
    });
    loadData();
  }

  return (
    <div className="p-4 max-w-md mx-auto w-full pb-24">
      <div className="flex justify-between items-center mb-6 bg-app-surface border border-app-border rounded-full p-1 shadow-sm">
        <button
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          className="p-3 text-app-muted hover:text-app-text transition-colors rounded-full hover:bg-app-bg flex-1 flex justify-center"
        >
          <ChevronLeft size={24} />
        </button>

        <div
          className="flex flex-col items-center justify-center flex-1 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setSelectedDate(new Date())}
          title="Voltar para hoje"
        >
          <h1 className="text-base font-bold text-app-text">
            {isToday(selectedDate)
              ? "Hoje"
              : format(selectedDate, "dd MMM", { locale: ptBR })}
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-wider text-app-muted">
            {format(selectedDate, "EEEE", { locale: ptBR })}
          </p>
        </div>

        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="p-3 text-app-muted hover:text-app-text transition-colors rounded-full hover:bg-app-bg flex-1 flex justify-center"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {todayDoses.length === 0 ? (
          <div className="text-center py-16 text-app-muted">
            <Bell size={48} className="mx-auto mb-4 opacity-20" />
            <p>
              Nenhum medicamento agendado para{" "}
              {isToday(selectedDate) ? "hoje" : "este dia"}.
            </p>
          </div>
        ) : (
          todayDoses.map((dose) => (
            <div
              key={dose.id}
              className="bg-app-surface p-5 rounded-3xl shadow-sm border border-app-border flex items-center gap-4 transition-colors"
            >
              <div className="flex flex-col items-center justify-center w-14 h-14 bg-app-primary-bg rounded-2xl text-app-primary">
                <span className="text-lg font-bold">
                  {format(dose.scheduledTime, "HH:mm")}
                </span>
              </div>

              <div
                className="flex-1 cursor-pointer overflow-hidden"
                onClick={() => setEditingMedicationId(dose.medicationId)}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-app-text text-lg leading-tight truncate">
                      {dose.medicationName}
                    </h3>
                    {dose.isAntibiotic && (
                      <span className="text-[10px] uppercase font-bold bg-app-primary/10 text-app-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                        Antibiótico
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm text-app-muted font-medium truncate">
                      Para {dose.personName}
                    </p>
                    {dose.dosage && (
                      <p className="text-sm text-app-muted opacity-80 mt-0.5 leading-snug">
                        {dose.dosage}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {dose.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDoseAction(dose.id, "skipped")}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-app-danger-bg text-app-danger hover:opacity-80 transition"
                  >
                    <X size={20} />
                  </button>
                  <button
                    onClick={() => handleDoseAction(dose.id, "taken")}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-app-success-bg text-app-success hover:opacity-80 transition"
                  >
                    <Check size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {dose.status === "taken" ? (
                    <span className="text-xs font-bold text-app-success bg-app-success-bg px-3 py-1 rounded-full uppercase tracking-wide">
                      Tomado
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-app-danger bg-app-danger-bg px-3 py-1 rounded-full uppercase tracking-wide">
                      Pulado
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {editingMedicationId && (
        <EditMedicationModal
          medicationId={editingMedicationId}
          onClose={() => setEditingMedicationId(null)}
          onUpdated={() => {
            setEditingMedicationId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
