import React, { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, Copy, AlertTriangle, Send, Clock, Sparkles } from "lucide-react";
import { DEFAULT_VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "../lib/vapid";

interface PushNotificationManagerProps {
  onClose?: () => void;
}

export function PushNotificationManager({ onClose }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

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
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker não é suportado neste navegador.");
      }
      const registration = await navigator.serviceWorker.ready;
      if (!registration.pushManager) {
        throw new Error("Push Notifications não são suportadas neste navegador/sistema.");
      }
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao verificar inscrição.");
    } finally {
      setIsLoading(false);
    }
  }

  async function requestPermission() {
    if (!("Notification" in window)) {
      setError("Notificações não são suportadas neste navegador.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        await checkSubscription();
      }
    } catch (err: any) {
      setError("Falha ao solicitar permissão de notificações.");
    } finally {
      setIsLoading(false);
    }
  }

  async function subscribeToPush() {
    setIsLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      setSubscription(sub);
    } catch (err: any) {
      console.error("Sub failed: ", err);
      setError(
        "Não foi possível criar a assinatura de Push. Certifique-se de estar usando HTTPS ou localhost e de que as notificações estão ativas no seu sistema."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribeFromPush() {
    if (!subscription) return;
    setIsLoading(true);
    setError(null);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
    } catch (err: any) {
      setError("Erro ao cancelar assinatura de Push.");
    } finally {
      setIsLoading(false);
    }
  }

  async function testLocalNotification() {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification("MedTime - Teste Local", {
        body: "Esta é uma notificação local enviada através do Service Worker!",
        icon: "/icon.jpg",
        badge: "/icon.jpg",
        vibrate: [100, 50, 100],
        data: { url: "/" }
      } as any);
    } catch (err: any) {
      setError("Não foi possível enviar a notificação local.");
    }
  }

  function testSimulatedPush() {
    if (countdown !== null) return;

    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          // Trigger notification
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification("MedTime - Notificação Agendada", {
              body: "Seu remédio está agendado para agora! (Simulador de segundo plano)",
              icon: "/icon.jpg",
              badge: "/icon.jpg",
              vibrate: [200, 100, 200],
              data: { url: "/" }
            } as any);
          });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const copyToClipboard = () => {
    if (!subscription) return;
    navigator.clipboard.writeText(JSON.stringify(subscription, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5 p-1">
      {/* Header Info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-app-primary-bg rounded-2xl flex items-center justify-center text-app-primary">
          <Bell size={20} />
        </div>
        <div>
          <h2 className="font-bold text-lg text-app-text">Notificações</h2>
          <p className="text-xs text-app-muted">Configure e teste notificações PWA</p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-app-danger-bg/50 border border-app-danger/30 rounded-2xl flex gap-3 text-app-danger text-xs leading-normal">
          <AlertTriangle size={18} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Permission Status */}
      <div className="bg-app-surface border border-app-border rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-app-text">Permissão de Notificação</span>
          {permission === "granted" ? (
            <span className="flex items-center gap-1 text-xs font-bold text-app-success bg-app-success-bg px-2.5 py-1 rounded-full uppercase tracking-wider">
              <CheckCircle2 size={12} /> Permitida
            </span>
          ) : permission === "denied" ? (
            <span className="flex items-center gap-1 text-xs font-bold text-app-danger bg-app-danger-bg px-2.5 py-1 rounded-full uppercase tracking-wider">
              <BellOff size={12} /> Bloqueada
            </span>
          ) : (
            <span className="text-xs font-bold text-app-muted bg-app-input px-2.5 py-1 rounded-full uppercase tracking-wider">
              Não Solicitada
            </span>
          )}
        </div>

        {permission !== "granted" && (
          <button
            onClick={requestPermission}
            disabled={isLoading}
            className="w-full py-3 bg-app-primary-solid text-app-primary-solid-text font-bold text-sm rounded-2xl shadow-md hover:opacity-90 transition active:scale-98 disabled:opacity-50"
          >
            {permission === "denied"
              ? "Notificações Bloqueadas no Navegador"
              : "Habilitar Permissão de Notificações"}
          </button>
        )}
      </div>

      {/* Push Subscription Controls */}
      {permission === "granted" && (
        <div className="bg-app-surface border border-app-border rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-app-text">Serviço de Push (VAPID)</span>
            {subscription ? (
              <span className="text-[10px] font-bold text-app-primary bg-app-primary-bg px-2.5 py-1 rounded-full uppercase tracking-wider">
                Assinado
              </span>
            ) : (
              <span className="text-[10px] font-bold text-app-muted bg-app-input px-2.5 py-1 rounded-full uppercase tracking-wider">
                Inativo
              </span>
            )}
          </div>

          {!subscription ? (
            <button
              onClick={subscribeToPush}
              disabled={isLoading}
              className="w-full py-3 bg-app-primary-bg text-app-primary font-bold text-sm rounded-2xl border border-app-primary/20 hover:bg-app-primary-bg/80 transition active:scale-98 disabled:opacity-50"
            >
              Inscrever para Receber Push
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-app-muted leading-relaxed">
                Você está inscrito para receber notificações externas. Copie os dados da inscrição para testar o envio de Web Push de um servidor.
              </p>

              <div className="relative">
                <pre className="text-[10px] font-mono bg-app-input border border-app-border rounded-2xl p-4 overflow-x-auto max-h-36 text-app-muted select-all">
                  {JSON.stringify(subscription, null, 2)}
                </pre>
                <button
                  onClick={copyToClipboard}
                  className="absolute top-2 right-2 p-2 bg-app-surface/90 border border-app-border rounded-xl text-app-muted hover:text-app-text transition active:scale-95 flex items-center gap-1 shadow-sm"
                >
                  <Copy size={12} />
                  <span className="text-[10px] font-semibold">{copied ? "Copiado!" : "Copiar"}</span>
                </button>
              </div>

              <button
                onClick={unsubscribeFromPush}
                disabled={isLoading}
                className="w-full py-2.5 bg-app-danger-bg text-app-danger font-semibold text-xs rounded-2xl hover:opacity-90 transition active:scale-98 disabled:opacity-50"
              >
                Cancelar Inscrição Push
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tests Section */}
      {permission === "granted" && (
        <div className="bg-app-surface border border-app-border rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
          <span className="text-sm font-semibold text-app-text">Testar Notificações</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={testLocalNotification}
              className="py-3 px-3 border border-app-border text-app-text font-semibold text-xs rounded-2xl hover:bg-app-bg transition active:scale-95 flex flex-col items-center gap-2 justify-center"
            >
              <Send size={16} className="text-app-primary" />
              Notificação Imediata
            </button>
            <button
              onClick={testSimulatedPush}
              disabled={countdown !== null}
              className="py-3 px-3 border border-app-border text-app-text font-semibold text-xs rounded-2xl hover:bg-app-bg transition active:scale-95 flex flex-col items-center gap-2 justify-center relative disabled:opacity-80"
            >
              {countdown !== null ? (
                <>
                  <Clock size={16} className="text-amber-500 animate-spin" />
                  <span>Em {countdown}s...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-amber-500" />
                  <span>Push Simulado (5s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
