'use client';

import { useState, lazy, Suspense, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  Globe,
  Eye,
  Cpu,
  Database,
  Puzzle,
  Bell,
  Mic,
  Search,
  Settings,
  Workflow,
} from 'lucide-react';

// Lazy-loaded sub-panels
const AutonomousMode = lazy(() => import('@/components/autonomous-mode'));
const BrowserAgentPanel = lazy(() => import('@/components/browser-agent-panel'));
const ConnectedServicesPanel = lazy(() => import('@/components/connected-services-panel'));
const DeepLearningPanel = lazy(() => import('@/components/deep-learning'));
const MemoryPanel = lazy(() => import('@/components/memory-panel'));
const PluginsPanel = lazy(() => import('@/components/plugins-panel'));
const RemindersPanel = lazy(() => import('@/components/reminders-panel'));
const VoiceStackPanel = lazy(() => import('@/components/voice-stack-panel'));

interface AgentTabContentProps {
  onSendCommand?: (command: string) => void;
}

const subTabs = [
  { id: 'auto', label: 'Autonomous', icon: Cpu },
  { id: 'brain', label: 'Deep Learn', icon: BrainCircuit },
  { id: 'browser', label: 'Browser', icon: Globe },
  { id: 'voice', label: 'Voice Stack', icon: Mic },
  { id: 'memory', label: 'Memory', icon: Database },
  { id: 'connect', label: 'Services', icon: Settings },
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
  { id: 'remind', label: 'Reminders', icon: Bell },
];

function Loader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-5 h-5 rounded-full border-2 border-lumina-primary/30 border-t-lumina-primary animate-spin" />
    </div>
  );
}

export default function AgentTabContent({ onSendCommand }: AgentTabContentProps) {
  const [activeSubTab, setActiveSubTab] = useState('auto');

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Sub-tab pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
                isActive
                  ? 'bg-lumina-primary text-lumina-on-primary shadow-sm'
                  : 'glass-pill text-lumina-on-surface-variant hover:text-lumina-on-surface hover:bg-white/60 dark:hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <Suspense fallback={<Loader />}>
            {activeSubTab === 'auto' && <AutonomousMode />}
            {activeSubTab === 'brain' && <DeepLearningPanel />}
            {activeSubTab === 'browser' && <BrowserAgentPanel />}
            {activeSubTab === 'voice' && <VoiceStackPanel />}
            {activeSubTab === 'memory' && <MemoryPanel />}
            {activeSubTab === 'connect' && <ConnectedServicesPanel />}
            {activeSubTab === 'plugins' && <PluginsPanel />}
            {activeSubTab === 'remind' && <RemindersPanel />}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
