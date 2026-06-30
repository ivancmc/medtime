import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "success" | "error";

export interface ToastData {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.variant === "success";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-medium border max-w-xs w-full pointer-events-auto ${
        isSuccess
          ? "bg-app-success-bg border-app-success/30 text-app-success"
          : "bg-app-danger-bg border-app-danger/30 text-app-danger"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      )}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return createPortal(
    <div className="fixed bottom-24 inset-x-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
