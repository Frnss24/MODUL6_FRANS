// ---------------------------------------------------------------------------
// queryCache.js — Dual-layer Query Caching (In-Memory Map + localStorage)
//
// Features:
//   - Fast in-memory Map lookup (L1 cache)
//   - Persistent localStorage fallback (L2 cache) for offline / reload speed
//   - Configurable TTL (Time-To-Live), default 5 minutes
//   - Prefix-based cache invalidation on mutations (Create / Update / Delete)
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'bb_qcache_'
const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

// L1 in-memory store: Map<string, { data: any, timestamp: number, ttl: number }>
const memoryCache = new Map()

/**
 * Retrieve cached query data by key.
 * @param {string} key
 * @returns {{ data: any, isStale: boolean, timestamp: number, ageMs: number } | null}
 */
export const getCachedQuery = (key) => {
  const now = Date.now()

  // 1. Check L1 in-memory cache first
  let entry = memoryCache.get(key)

  // 2. Fallback to L2 localStorage cache
  if (!entry) {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
      if (raw) {
        entry = JSON.parse(raw)
        if (entry && entry.timestamp) {
          memoryCache.set(key, entry)
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }

  if (!entry || !entry.timestamp) return null

  const ageMs = now - entry.timestamp
  const ttl = entry.ttl ?? DEFAULT_TTL_MS
  const isStale = ageMs > ttl

  return {
    data: entry.data,
    isStale,
    timestamp: entry.timestamp,
    ageMs,
  }
}

/**
 * Save query result into both L1 (memory) and L2 (localStorage) cache.
 * @param {string} key
 * @param {any} data
 * @param {number} [ttl=DEFAULT_TTL_MS]
 */
export const setCachedQuery = (key, data, ttl = DEFAULT_TTL_MS) => {
  const entry = {
    data,
    timestamp: Date.now(),
    ttl,
  }

  memoryCache.set(key, entry)

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry))
  } catch {
    // Quota exceeded or private browsing — memoryCache still works
  }
}

/**
 * Invalidate cache entries whose key starts with the given prefix.
 * Called automatically after POST / PUT / PATCH / DELETE mutations.
 * @param {string} prefix
 */
export const invalidateQueryCache = (prefix = '') => {
  for (const k of memoryCache.keys()) {
    if (!prefix || k.startsWith(prefix)) {
      memoryCache.delete(k)
    }
  }

  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i)
      if (
        storageKey &&
        storageKey.startsWith(`${STORAGE_PREFIX}${prefix}`)
      ) {
        keysToRemove.push(storageKey)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all cached queries.
 */
export const clearAllQueryCache = () => {
  invalidateQueryCache('')
}

/**
 * Return current cache statistics for debugging / UI indicator.
 */
export const getCacheStats = () => {
  return {
    memoryEntries: memoryCache.size,
    keys: Array.from(memoryCache.keys()),
  }
}

