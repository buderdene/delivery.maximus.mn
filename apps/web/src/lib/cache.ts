/**
 * Simple In-Memory LRU Cache
 * Fallback when SQLite bindings are not available
 * Uses Map for storage with TTL support
 */

// Cache configuration
export const CACHE_CONFIG = {
  // TTL in seconds
  products: 5 * 60,      // 5 minutes
  categories: 60 * 60,   // 1 hour
  brands: 60 * 60,       // 1 hour
  partners: 5 * 60,      // 5 minutes
  default: 5 * 60,       // 5 minutes
  maxEntries: 1000,      // Max cache entries
} as const;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

// In-memory cache storage
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get cached data by key
 */
export function getCache<T>(key: string): T | null {
  try {
    const now = Date.now();
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    
    if (entry && entry.expiresAt > now) {
      return entry.data;
    }
    
    // Remove expired entry
    if (entry) {
      cache.delete(key);
    }
    
    return null;
  } catch (error) {
    console.error('[Cache] Get error:', error);
    return null;
  }
}

/**
 * Set cache data with TTL
 */
export function setCache<T>(key: string, data: T, ttlSeconds: number = CACHE_CONFIG.default): void {
  try {
    const now = Date.now();
    
    // Enforce max entries (simple LRU: remove oldest entries)
    if (cache.size >= CACHE_CONFIG.maxEntries) {
      const keysToDelete: string[] = [];
      let count = 0;
      const deleteCount = Math.floor(CACHE_CONFIG.maxEntries * 0.1); // Remove 10%
      
      for (const [k, v] of cache) {
        if (v.expiresAt <= now || count < deleteCount) {
          keysToDelete.push(k);
          count++;
        }
        if (count >= deleteCount) break;
      }
      
      keysToDelete.forEach(k => cache.delete(k));
    }
    
    cache.set(key, {
      data,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now,
    });
  } catch (error) {
    console.error('[Cache] Set error:', error);
  }
}

/**
 * Delete cache entry
 */
export function deleteCache(key: string): void {
  cache.delete(key);
}

/**
 * Delete cache entries by prefix
 */
export function deleteCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all expired cache entries
 */
export function clearExpiredCache(): number {
  const now = Date.now();
  let cleared = 0;
  
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
      cleared++;
    }
  }
  
  return cleared;
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats(): { total: number; expired: number; size: number } {
  const now = Date.now();
  let expired = 0;
  
  for (const entry of cache.values()) {
    if (entry.expiresAt <= now) {
      expired++;
    }
  }
  
  // Estimate memory size (rough approximation)
  let size = 0;
  for (const [key, value] of cache) {
    size += key.length * 2; // String chars
    size += JSON.stringify(value.data).length * 2;
  }
  
  return { total: cache.size, expired, size };
}

/**
 * Generate cache key from URL and params
 */
export function generateCacheKey(endpoint: string, params?: Record<string, string | number | undefined>): string {
  const cleanParams = params 
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
    : '';
  
  return cleanParams ? `${endpoint}:${cleanParams}` : endpoint;
}

/**
 * Cached fetch wrapper
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = CACHE_CONFIG.default
): Promise<{ data: T; fromCache: boolean }> {
  // Try to get from cache first
  const cached = getCache<T>(key);
  
  if (cached !== null) {
    console.log(`[Cache] HIT: ${key}`);
    return { data: cached, fromCache: true };
  }
  
  console.log(`[Cache] MISS: ${key}`);
  
  // Fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  setCache(key, data, ttlSeconds);
  
  return { data, fromCache: false };
}

// Cleanup expired entries periodically (every 10 minutes)
if (typeof setInterval !== 'undefined' && typeof window === 'undefined') {
  setInterval(() => {
    const cleared = clearExpiredCache();
    if (cleared > 0) {
      console.log(`[Cache] Cleared ${cleared} expired entries`);
    }
  }, 10 * 60 * 1000);
}
