'use client';

import { Mic, History, BrainCircuit, Wrench, Settings, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useAgentStore } from "@/lib/stores/agent-store";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "talk", label: "Talk", icon: Mic },
  { id: "history", label: "History", icon: History },
  { id: "tasks", label: "Tasks", icon: BrainCircuit },
  { id: "agent", label: "Ultra", icon: Zap },
  { id: "tools", label: "Tools", icon: Wrench },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const setSettingsOpen = useAgentStore((s) => s.setSettingsOpen);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex flex-col justify-center items-center px-4 py-2 bg-lumina-surface/80 backdrop-blur-3xl shadow-[0_-4px_24px_rgba(70,72,212,0.05)] rounded-t-3xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Frosted glass top border with gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lumina-primary/20 to-transparent" />
      
      <div className="flex justify-around items-center w-full max-w-md">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={[
                "flex flex-col items-center justify-center gap-1 relative py-2 px-3 min-w-[56px] transition-all duration-200",
                isActive
                  ? "text-lumina-primary"
                  : "text-lumina-on-surface-variant/50 hover:text-lumina-primary",
              ].join(" ")}
              onClick={() => onTabChange(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -top-2 w-6 h-0.5 rounded-full bg-lumina-primary"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-lumina-primary/10' : ''}`}>
                <Icon
                  className="w-5 h-5"
                  fill={isActive ? "currentColor" : "none"}
                  strokeWidth={isActive ? 0 : 1.5}
                />
              </div>
              <span className="font-[family-name:var(--font-body)] text-[10px] font-semibold uppercase tracking-[0.05em]">
                {item.label}
              </span>
            </button>
          );
        })}
        
        {/* Settings button in bottom nav on mobile */}
        <button
          className="flex flex-col items-center justify-center gap-1 relative py-2 px-3 min-w-[56px] text-lumina-on-surface-variant/40 hover:text-lumina-primary transition-all duration-200"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
        >
          <div className="p-1.5 rounded-xl">
            <Settings className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <span className="font-[family-name:var(--font-body)] text-[10px] font-semibold uppercase tracking-[0.05em]">
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
