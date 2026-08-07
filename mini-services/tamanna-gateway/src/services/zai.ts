import ZAI from 'z-ai-web-dev-sdk';

let _zai: any = null;
let _initPromise: Promise<any> | null = null;

/**
 * Shared ZAI SDK singleton.
 * All agents and services should use this instead of creating their own instances.
 * The SDK is pre-warmed once and reused everywhere.
 */
export async function getZAI(): Promise<any> {
  if (_zai) return _zai;
  
  if (_initPromise) {
    return _initPromise;
  }

  _initPromise = (async () => {
    try {
      console.log('[ZAI] Initializing shared SDK...');
      _zai = await ZAI.create();
      console.log('[ZAI] Shared SDK ready.');
      return _zai;
    } catch (err: any) {
      console.error('[ZAI] Failed to initialize:', err?.message || err);
      _initPromise = null;
      throw err;
    }
  })();

  return _initPromise;
}

export function resetZAI(): void {
  console.log('[ZAI] Resetting shared SDK instance.');
  _zai = null;
  _initPromise = null;
}
