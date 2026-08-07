'use client';

import { useRef, useEffect } from 'react';
import { useAgentStore } from '@/lib/stores/agent-store';

/**
 * Lightweight connection manager — manages conversation ID initialization.
 * Socket.io is DISABLED to prevent gateway crashes from polling connections.
 * All communication goes via direct HTTP POST to /api/chat which returns
 * response text + TTS audio chunks in a single request.
 */
export function useSocket() {
  const socketRef = useRef<{ id: string } | null>(null);

  const setConversationId = useAgentStore((s) => s.setConversationId);
  const setIsConnected = useAgentStore((s) => s.setIsConnected);

  useEffect(() => {
    // Mark as connected (we don't need socket.io, direct HTTP works)
    setIsConnected(true);
    // Generate a unique conversation ID on mount
    setConversationId('conv_' + crypto.randomUUID().slice(0, 12));
  }, [setIsConnected, setConversationId]);

  return { socket: socketRef };
}
