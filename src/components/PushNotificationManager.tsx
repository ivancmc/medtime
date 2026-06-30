import React, { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

interface PushNotificationManagerProps {
  onClose?: () => void;
}

export function PushNotificationManager({ onClose }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    checkSubscription();
  }, []);

  async function checkSubscription() {
    setIsLoading(true);
    setError(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push Notifications não são suportadas neste navegador.");
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (err: any) {
      setError(err.message || "Erro ao verificar inscrição.");
    } finally {
      setIsLoading(false);
    }
  }

  async function requestPermission() {
    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") await checkSubscription();
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribe() {
    if (!subscription) return;
    setIsLoading(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
    } catch {
      setError("Erro ao cancelar inscrição.");
    } finally {
      setIsLoading(false);
    }
  }

  const isActive = permission === "granted" && !!subscription;

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-app-primary-bg rounded-2xl flex items-center justify-center text-app-primary">
          <Bell size={20} />
        </div>
        <div>
          <h2 className="font-bold text-lg text-app-text">Notificações</h2>
          <p className="text-xs text-app-muted">Gerencie os lembretes push deste dispositivo</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-app-danger-bg/50 border border-app-danger/30 rounded-2xl flex gap-3 text-app-danger text-xs leading-normal">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Status card */}
      <div className="bg-app-surface border border-app-border rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
        {/* Permission row */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-app-text">Permissão</span>
          {permission === "granted" ? (
            <span className="flex items-center gap-1 text-xs font-bold text-app-success bg-app-success-bg px-2.5 py-1 rounded-full uppercase tracking-wider">
              <CheckCircle2 size={11} /> Permitida
            </span>
          ) : permission === "denied" ? (
            <span className="flex items-center gap-1 text-xs font-bold text-app-danger bg-app-danger-bg px-2.5 py-1 rounded-full uppercase tracking-wider">
              <BellOff size={11} /> Bloqueada
            </span>
          ) : (
            <span className="text-xs font-bold text-app-muted bg-app-input px-2.5 py-1 rounded-full uppercase tracking-wider">
              Não solicitada
            </span>
          )}
        </div>

        {/* Subscription row — only meaningful when permission is granted */}
        {permission === "granted" && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-app-text">Inscrição push</span>
            {isLoading ? (
              <span className="text-xs text-app-muted">Verificando...</span>
            ) : subscription ? (
              <span className="text-xs font-bold text-app-primary bg-app-primary-bg px-2.5 py-1 rounded-full uppercase tracking-wider">
                Ativa
              </span>
            ) : (
              <span className="text-xs font-bold text-app-muted bg-app-input px-2.5 py-1 rounded-full uppercase tracking-wider">
                Inativa
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action area */}
      {permission === "default" && (
        <button
          onClick={requestPermission}
          disabled={isLoading}
          className="w-full py-3.5 bg-app-primary-solid text-app-primary-solid-text font-bold text-sm rounded-2xl shadow-md hover:opacity-90 transition active:scale-98 disabled:opacity-50"
        >
          Habilitar notificações
        </button>
      )}

      {permission === "denied" && (
        <div className="flex gap-3 p-4 bg-app-input border border-app-border rounded-2xl text-sm text-app-muted leading-relaxed">
          <ShieldAlert size={18} className="shrink-0 mt-0.5 text-app-danger" />
          <p>
            As notificações estão bloqueadas no navegador. Para reativar, acesse as configurações do site e permita notificações manualmente.
          </p>
        </div>
      )}

      {permission === "granted" && subscription && (
        <button
          onClick={unsubscribe}
          disabled={isLoading}
          className="w-full py-3 bg-app-danger-bg text-app-danger font-semibold text-sm rounded-2xl hover:opacity-90 transition active:scale-98 disabled:opacity-50"
        >
          Desativar lembretes push
        </button>
      )}

      {permission === "granted" && !subscription && !isLoading && (
        <p className="text-xs text-app-muted text-center leading-relaxed">
          A inscrição push será criada automaticamente ao adicionar um lembrete.
        </p>
      )}
    </div>
  );
}
