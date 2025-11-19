/**
 * Client-side caching for API responses
 */

export interface CacheOptions {
  maxAge?: number; // Maximum age in milliseconds (default: 5 minutes)
  maxSize?: number; // Maximum number of cached entries (default: 100)
  storage?: 'memory' | 'localStorage'; // Storage type (default: 'memory')
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL and size limits
 */
export class ApiCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxAge: number;
  private maxSize: number;
  private storage: 'memory' | 'localStorage';

  constructor(options: CacheOptions = {}) {
    this.maxAge = options.maxAge ?? 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize ?? 100;
    this.storage = options.storage ?? 'memory';

    // Load from localStorage if using localStorage storage
    if (this.storage === 'localStorage') {
      this.loadFromLocalStorage();
    }

    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Generate cache key from request
   */
  private generateKey(method: string, url: string, data?: unknown): string {
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${dataStr}`;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Get cached response
   */
  get<T>(method: string, url: string, data?: unknown): T | null {
    const key = this.generateKey(method, url, data);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached response
   */
  set<T>(method: string, url: string, data: unknown, response: T): void {
    const key = this.generateKey(method, url, data);

    // Remove oldest entries if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry<T> = {
      data: response,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.maxAge,
    };

    this.cache.set(key, entry);

    // Save to localStorage if using localStorage storage
    if (this.storage === 'localStorage') {
      this.saveToLocalStorage();
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    if (this.storage === 'localStorage') {
      try {
        localStorage.removeItem('iris-api-cache');
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    // Save to localStorage if using localStorage storage
    if (this.storage === 'localStorage' && this.cache.size > 0) {
      this.saveToLocalStorage();
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      const serialized = Array.from(this.cache.entries()).map(([key, entry]) => [
        key,
        {
          data: entry.data,
          timestamp: entry.timestamp,
          expiresAt: entry.expiresAt,
        },
      ]);
      localStorage.setItem('iris-api-cache', JSON.stringify(serialized));
    } catch (e) {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('iris-api-cache');
      if (stored) {
        const entries = JSON.parse(stored) as Array<[string, CacheEntry<unknown>]>;
        const now = Date.now();
        for (const [key, entry] of entries) {
          // Only load non-expired entries
          if (entry.expiresAt > now) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; expired: number } {
    const now = Date.now();
    let expired = 0;
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      }
    }
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
    };
  }
}

