interface CacheEntry {
  value: any;
  expiresAt: number;
}

/**
 * In-memory LRU cache with per-entry TTL.
 *
 * - `maxSize`: maximum number of entries (default 500)
 * - `defaultTtlMs`: default time-to-live in ms (default 1 hour)
 *
 * On `set()`, if the cache is full the *least-recently-used* entry is evicted.
 * On `get()`, expired entries are lazily removed.
 */
export class LRUCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private defaultTtlMs: number;

  constructor(maxSize = 500, defaultTtlMs = 3600000) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
  }

  /** Retrieve a value. Returns null if missing or expired. */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Re-insert to move to end (most-recently-used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /** Store a value with an optional per-entry TTL. */
  set(key: string, value: any, ttlMs?: number): void {
    // If key already exists, delete first so it moves to end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict LRU if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      } else {
        break;
      }
    }

    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
  }

  /** Delete a specific key. */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /** Remove all entries. */
  clear(): void {
    this.cache.clear();
  }

  /** Check if a non-expired entry exists. */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Current number of entries (including potentially expired ones). */
  get size(): number {
    return this.cache.size;
  }

  /** Remove all expired entries in one pass. */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
