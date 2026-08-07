'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type GatewayStatus = 'online' | 'reconnecting' | 'starting' | 'offline';

const STATUS_CONFIG: Record<GatewayStatus, { dot: string; label: string }> = {
  online: { dot: 'bg-emerald-400 shadow-emerald-400/40', label: 'Online' },
  reconnecting: { dot: 'bg-amber-400 shadow-amber-400/40', label: 'Reconnecting...' },
  starting: { dot: 'bg-amber-400 shadow-amber-400/40', label: 'Gateway starting...' },
  offline: { dot: 'bg-red-400 shadow-red-400/40', label: 'Gateway offline' },
};

/** Check gateway health via GET /api/gateway/restart */
async function checkGatewayHealth(): Promise<GatewayStatus> {
  try {
    const res = await fetch('/api/gateway/restart', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'online') return 'online';
      return 'starting';
    }
    return 'offline';
  } catch {
    return 'offline';
  }
}

export default function StatusBar() {
  const [status, setStatus] = useState<GatewayStatus>('reconnecting');
  const attemptsRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const poll = async () => {
      if (!mountedRef.current) return;
      const result = await checkGatewayHealth();
      if (!mountedRef.current) return;

      if (result === 'online') {
        attemptsRef.current = 0;
        setStatus('online');
      } else {
        attemptsRef.current += 1;
        setStatus(attemptsRef.current >= 3 ? 'offline' : 'reconnecting');
      }
    };

    // Schedule first check via setTimeout so setState happens in a callback, not synchronously in the effect
    const initialTimeout = setTimeout(poll, 0);
    const interval = setInterval(poll, 15_000);

    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  const config = STATUS_CONFIG[status];

  return (
    <div className="w-full flex justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="glass-pill inline-flex items-center gap-2 py-2 px-3 text-xs"
        >
          <span className="relative flex h-2 w-2">
            {/* Pulse ring for non-offline states */}
            {status !== 'offline' && (
              <span
                className={`absolute inset-0 rounded-full ${config.dot} animate-ping opacity-40`}
              />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${config.dot} shadow-sm`}
            />
          </span>
          <span className="font-[family-name:var(--font-body)] text-lumina-on-surface-variant">
            {config.label}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
