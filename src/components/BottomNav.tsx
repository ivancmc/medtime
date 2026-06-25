import React from "react";
import { Calendar, History, PlusCircle } from "lucide-react";
import { cn } from "../lib/utils";

export type Tab = "today" | "people" | "history" | "add";

interface BottomNavProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-app-surface border-t border-app-border pb-safe transition-colors z-50">
      <div className="flex justify-around items-center h-16 w-full">
        <NavItem
          icon={<History />}
          label="Histórico"
          isActive={activeTab === "history"}
          onClick={() => onChange("history")}
        />
        <NavItem
          icon={<Calendar />}
          label="Hoje"
          isActive={activeTab === "today"}
          onClick={() => onChange("today")}
        />
        <NavItem
          icon={<PlusCircle />}
          label="Adicionar"
          isActive={activeTab === "add"}
          onClick={() => onChange("add")}
        />
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
        isActive ? "text-app-primary" : "text-app-muted hover:text-app-text",
      )}
    >
      <div className={cn("w-6 h-6", isActive && "stroke-[2.5px]")}>{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
