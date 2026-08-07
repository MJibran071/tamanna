"use client";

import { useState } from "react";
import { Settings, User, Plus, Sun, Moon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useAgentStore } from "@/lib/stores/agent-store";
import SettingsSheet from "@/components/settings-sheet";
import AccountSheet from "@/components/account-sheet";

interface TopBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const desktopNavItems = [
  { id: "talk", label: "Talk" },
  { id: "history", label: "History" },
  { id: "tasks", label: "Tasks" },
  { id: "agent", label: "Ultra" },
  { id: "tools", label: "Tools" },
];

function ConnectionDot() {
  const isConnected = useAgentStore((s) => s.isConnected);
  return (
    <div className="flex items-center justify-center">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-emerald-500 connection-pulse" : "bg-red-500"
        }`}
        aria-label={isConnected ? "Connected" : "Disconnected"}
      />
    </div>
  );
}

function LogoIcon({ size = "sm" }: { size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-lumina-primary to-lumina-secondary flex items-center justify-center shrink-0 animate-[logo-pulse_3s_ease-in-out_infinite]`}
      aria-hidden="true"
    >
      <span
        className={`${textSize} font-bold text-lumina-on-primary select-none`}
      >
        T
      </span>
    </div>
  );
}

export default function TopBar({ activeTab, onTabChange }: TopBarProps) {
  const settingsOpen = useAgentStore((s) => s.settingsOpen);
  const setSettingsOpen = useAgentStore((s) => s.setSettingsOpen);
  const startNewConversation = useAgentStore((s) => s.startNewConversation);
  const [accountOpen, setAccountOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex fixed top-0 w-full z-50 flex-col">
        <div className="bg-lumina-surface/80 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-sm flex justify-between items-center px-8 lg:px-16 h-16 max-w-screen-xl w-full mx-auto">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-3">
            <LogoIcon size="md" />
            <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-gradient-primary text-glow">
              Tamanna
            </span>
          </div>

          {/* Center: Nav Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {desktopNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-lumina-primary/10 text-lumina-primary"
                      : "text-lumina-on-surface-variant hover:text-lumina-primary hover:bg-lumina-surface-variant/50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* New Chat Button — desktop only */}
            <button
              onClick={startNewConversation}
              className="glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-lumina-primary hover:bg-lumina-primary/10 transition-colors"
              aria-label="New Chat"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xl:inline">New Chat</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="glass-pill p-2 rounded-full text-lumina-primary hover:bg-lumina-primary/10 transition-colors"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {isDark ? (
                  <motion.span
                    key="sun"
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <Sun className="w-4 h-4" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <Moon className="w-4 h-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              className="text-lumina-primary hover:opacity-80 transition-opacity p-2 rounded-full hover:bg-lumina-surface-variant/50"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              className="text-lumina-primary hover:opacity-80 transition-opacity p-2 rounded-full hover:bg-lumina-surface-variant/50"
              aria-label="Account"
              onClick={() => setAccountOpen(true)}
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-lumina-primary/30 to-transparent" />
      </header>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 w-full z-50 bg-transparent flex justify-between items-center px-5 h-14 pt-[max(0rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          <LogoIcon size="sm" />
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-gradient-primary text-glow">
            Tamanna
          </span>
        </div>
        <button
          className="text-lumina-primary p-2 rounded-full hover:bg-lumina-surface-variant/50 transition-colors"
          aria-label="Account"
          onClick={() => setAccountOpen(true)}
        >
          <User className="w-5 h-5" />
        </button>
      </header>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
}
