// Simple in-memory cache (use Redis in production)
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
  }

  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    
    // Clear existing timeout
    if (this.ttls.has(key)) {
      clearTimeout(this.ttls.get(key));
    }

    // Set expiration
    const timeout = setTimeout(() => {
      this.cache.delete(key);
      this.ttls.delete(key);
    }, ttlSeconds * 1000);

    this.ttls.set(key, timeout);
  }

  get(key) {
    return this.cache.get(key) || null;
  }

  delete(key) {
    if (this.ttls.has(key)) {
      clearTimeout(this.ttls.get(key));
      this.ttls.delete(key);
    }
    this.cache.delete(key);
  }

  clear() {
    this.ttls.forEach(timeout => clearTimeout(timeout));
    this.cache.clear();
    this.ttls.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Cache middleware wrapper
const cacheMiddleware = (cache, ttl = 300) => {
  return (req, res, next) => {
    const cacheKey = `${req.method}:${req.originalUrl}`;
    
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Intercept res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      if (res.statusCode === 200) {
        cache.set(cacheKey, body, ttl);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

// Invalidate cache for specific patterns
const invalidateCache = (cache, pattern) => {
  const regex = new RegExp(pattern);
  const stats = cache.getStats();
  
  stats.keys.forEach(key => {
    if (regex.test(key)) {
      cache.delete(key);
    }
  });
};

// Create singleton instance
const cache = new CacheManager();

module.exports = {
  cache,
  CacheManager,
  cacheMiddleware,
  invalidateCache
};
