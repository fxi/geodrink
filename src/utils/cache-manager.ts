interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  bounds: string;
  bufferDistance: number;
}

export class CacheManager {
  private static readonly CACHE_PREFIX = 'geodrink_cache_';
  private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  static generateCacheKey(bounds: { north: number; south: number; east: number; west: number }, bufferDistance: number): string {
    const boundsStr = `${bounds.north.toFixed(4)}_${bounds.south.toFixed(4)}_${bounds.east.toFixed(4)}_${bounds.west.toFixed(4)}`;
    return `${this.CACHE_PREFIX}${boundsStr}_${bufferDistance}`;
  }

  static set<T>(key: string, data: T, bounds: { north: number; south: number; east: number; west: number }, bufferDistance: number): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        bounds: JSON.stringify(bounds),
        bufferDistance
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  static get<T = unknown>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();

      // Check if cache has expired
      if (now - entry.timestamp > this.CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      return null;
    }
  }

  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  static getCacheInfo(): { totalEntries: number; totalSize: number } {
    let totalEntries = 0;
    let totalSize = 0;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          totalEntries++;
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += item.length;
          }
        }
      });
    } catch (error) {
      console.warn('Failed to get cache info:', error);
    }

    return { totalEntries, totalSize };
  }
}
