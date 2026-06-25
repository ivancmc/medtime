/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav, Tab } from "./components/BottomNav";
import { TodayPage } from "./components/TodayPage";
import { PeoplePage } from "./components/PeoplePage";
import { HistoryPage } from "./components/HistoryPage";
import { AddPage } from "./components/AddPage";
import { ThemeToggle } from "./components/ThemeToggle";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PushNotificationManager } from "./components/PushNotificationManager";
import { Users, Bell, X } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <div className="h-[100dvh] flex flex-col bg-app-bg pt-safe font-sans text-app-text overflow-hidden max-w-md mx-auto w-full relative shadow-2xl border-x border-app-border">
      <header className="flex justify-between items-center p-4 w-full shrink-0">
        <button
          onClick={() => setActiveTab("people")}
          className="p-2 text-app-muted hover:text-app-text transition-colors rounded-full"
          title="Pessoas"
        >
          <Users size={20} />
        </button>
        <div className="font-bold text-lg text-app-primary">MedTime</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsNotificationOpen(true)}
            className="p-2 text-app-muted hover:text-app-text transition-colors rounded-full"
            title="Notificações"
          >
            <Bell size={20} />
          </button>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === "today" && (
            <motion.div
              key="today"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TodayPage />
            </motion.div>
          )}
          {activeTab === "people" && (
            <motion.div
              key="people"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PeoplePage />
            </motion.div>
          )}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <HistoryPage />
            </motion.div>
          )}
          {activeTab === "add" && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AddPage onAdded={() => setActiveTab("today")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />

      <PWAInstallPrompt />

      {isNotificationOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-app-surface rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-app-border overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsNotificationOpen(false)}
              className="absolute top-4 right-4 p-2 text-app-muted hover:text-app-text bg-app-bg rounded-full transition-colors"
            >
              <X size={18} />
            </button>
            <PushNotificationManager onClose={() => setIsNotificationOpen(false)} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
