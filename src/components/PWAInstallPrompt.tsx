import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Smartphone, X, Sparkles, ArrowDownToLine } from "lucide-react";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (already installed)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (navigator as any).standalone 
      || document.referrer.includes("android-app://");

    if (isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event so it can be triggered later.
      setDeferredPrompt(e);
      // Check if user dismissed it in this session to avoid annoying them
      const dismissed = sessionStorage.getItem("pwa-prompt-dismissed");
      if (!dismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If the event was already fired before registration (rare but possible),
    // browsers might not fire it again. But in typical SPAs, this listener is set up early enough.
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    setIsVisible(false);
    // Show the native browser install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt choice: ${outcome}`);
    
    // We no longer need the prompt, clear it
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute bottom-24 left-4 right-4 z-50 bg-app-surface/90 backdrop-blur-xl border border-app-border rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-w-[calc(100%-2rem)]"
        >
          <div className="flex justify-between items-start">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-app-primary-bg rounded-2xl flex items-center justify-center text-app-primary relative shrink-0">
                <Smartphone size={24} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-app-primary text-[10px] text-white rounded-full flex items-center justify-center animate-pulse">
                  <ArrowDownToLine size={10} />
                </span>
              </div>
              <div>
                <h3 className="font-bold text-app-text text-base flex items-center gap-1.5">
                  Instalar MedMinder <Sparkles size={14} className="text-amber-500 fill-amber-500" />
                </h3>
                <p className="text-xs text-app-muted mt-1 leading-normal">
                  Acesse instantaneamente da sua tela inicial, offline e receba alertas de remédios no seu celular.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-app-muted hover:text-app-text rounded-full hover:bg-app-bg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-3 w-full mt-1">
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 px-4 rounded-2xl border border-app-border text-app-text text-sm font-semibold hover:bg-app-bg transition active:scale-95"
            >
              Agora Não
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 py-3 px-4 rounded-2xl bg-app-primary-solid text-app-primary-solid-text text-sm font-semibold shadow-lg shadow-app-primary/20 hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2"
            >
              Instalar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
