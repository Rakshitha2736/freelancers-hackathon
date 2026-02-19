// backend/utils/performanceMonitor.js

/**
 * Performance monitoring utilities for tracking and optimizing application performance
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      API_RESPONSE: 200, // ms
      DB_QUERY: 100,     // ms
      EXTERNAL_API: 500, // ms
      PROCESSING: 1000   // ms
    };
  }

  /**
   * Record metric execution time
   */
  recordMetric(name, duration, metadata = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metric = {
      duration,
      timestamp: new Date(),
      ...metadata
    };

    this.metrics.get(name).push(metric);

    // Check threshold
    if (duration > this.thresholds[name] || duration > 500) {
      console.warn(`⚠️  Slow metric: ${name} took ${duration}ms`);
    }
  }

  /**
   * Measure async function execution
   */
  async measure(name, fn, metadata = {}) {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      this.recordMetric(`${name}:error`, duration, { error: error.message });
      throw error;
    }
  }

  /**
   * Get statistics for a metric
   */
  getMetricStats(name) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    const durations = values.map(v => v.duration);
    const sorted = [...durations].sort((a, b) => a - b);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / values.length),
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Get all metrics summary
   */
  getSummary() {
    const summary = {};
    for (const [name] of this.metrics) {
      summary[name] = this.getMetricStats(name);
    }
    return summary;
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(maxAge = 3600000) { // 1 hour default
    const cutoff = Date.now() - maxAge;
    for (const [name, values] of this.metrics.entries()) {
      const filtered = values.filter(v => v.timestamp.getTime() > cutoff);
      if (filtered.length === 0) {
        this.metrics.delete(name);
      } else {
        this.metrics.set(name, filtered);
      }
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
  }
}

// Query optimization helper
class QueryOptimizer {
  /**
   * Analyze query performance and suggest improvements
   */
  static analyzeQuery(query, executionTime) {
    const suggestions = [];

    if (executionTime > 100) {
      suggestions.push('Consider adding indexes to frequently queried fields');
    }

    if (query.includes('$text') && executionTime > 200) {
      suggestions.push('Text search is slow - consider using specialized search engine');
    }

    if (query.includes('$lookup') && executionTime > 300) {
      suggestions.push('Population/lookup is expensive - consider denormalization');
    }

    if (executionTime > 500) {
      suggestions.push('Query timeout risk - add query limits or pagination');
    }

    return suggestions;
  }

  /**
   * Generate optimized query plan
   */
  static generateOptimizedPlan(originalQuery) {
    const plan = {
      original: originalQuery,
      optimizations: [],
      estimated_improvement: 0
    };

    // Add specific optimizations based on query patterns
    if (originalQuery.match(/find/i)) {
      plan.optimizations.push('Add lean() for read-only queries');
      plan.estimated_improvement += 15;
    }

    if (originalQuery.match(/populate/i)) {
      plan.optimizations.push('Use select() to limit populated fields');
      plan.estimated_improvement += 20;
    }

    if (originalQuery.match(/sort.*limit/i)) {
      plan.optimizations.push('Ensure sort field is indexed');
      plan.estimated_improvement += 25;
    }

    return plan;
  }
}

// Middleware for tracking request performance
const performanceMiddleware = (monitor) => {
  return (req, res, next) => {
    const start = performance.now();

    // Override res.json to capture response time
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Math.round(performance.now() - start);
      
      monitor.recordMetric('HTTP_REQUEST', duration, {
        method: req.method,
        path: req.path,
        status: res.statusCode
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

// Database connection pooling and optimization
class DatabaseOptimizer {
  static getConnectionPoolConfig() {
    return {
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 45000,
      waitQueueTimeoutMS: 10000
    };
  }

  static getMongooseConfig() {
    return {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4
    };
  }

  static getIndexRecommendations() {
    return [
      // User indexes
      { collection: 'users', fields: { email: 1 }, unique: true },
      { collection: 'users', fields: { createdAt: -1 } },
      
      // Analysis indexes
      { collection: 'analyses', fields: { userId: 1, createdAt: -1 } },
      { collection: 'analyses', fields: { status: 1 } },
      { collection: 'analyses', fields: { tags: 1 } },
      
      // Task indexes
      { collection: 'tasks', fields: { analysisId: 1, status: 1 } },
      { collection: 'tasks', fields: { owner: 1, deadline: 1 } },
      { collection: 'tasks', fields: { priority: 1, status: 1 } },
      
      // Comment indexes
      { collection: 'comments', fields: { analysisId: 1, createdAt: -1 } },
      
      // Permission indexes
      { collection: 'permissions', fields: { analysisId: 1, userId: 1 }, unique: true },
      
      // Activity indexes
      { collection: 'activity', fields: { analysisId: 1, timestamp: -1 } }
    ];
  }
}

// Memory monitoring
class MemoryMonitor {
  static getCurrentMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
      external: Math.round(usage.external / 1024 / 1024) + ' MB',
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) + ' MB'
    };
  }

  static getMemoryWarnings() {
    const usage = process.memoryUsage();
    const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;

    const warnings = [];
    if (heapUsagePercent > 90) warnings.push('⚠️  Heap usage critical (>90%)');
    if (heapUsagePercent > 75) warnings.push('⚠️  Heap usage high (>75%)');
    if (usage.heapTotal > 500 * 1024 * 1024) warnings.push('⚠️  Total heap >500MB');

    return warnings;
  }
}

// Cache efficiency metrics
class CacheAnalytics {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  recordHit() {
    this.hits++;
  }

  recordMiss() {
    this.misses++;
  }

  recordEviction() {
    this.evictions++;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : 'N/A',
      totalRequests: total
    };
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
}

module.exports = {
  PerformanceMonitor,
  QueryOptimizer,
  performanceMiddleware,
  DatabaseOptimizer,
  MemoryMonitor,
  CacheAnalytics
};
