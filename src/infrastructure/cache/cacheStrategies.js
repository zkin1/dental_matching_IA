/**
 * DENTAL MATCHING - CACHE STRATEGIES
 * Advanced caching patterns and strategies
 */

const loggerService = require('../logging/logger');

class CacheStrategies {
  constructor(cacheService) {
    this.cache = cacheService;
    this.defaultTTL = {
      users: 1800,        // 30 minutes
      patients: 3600,     // 1 hour
      students: 3600,     // 1 hour
      assignments: 1800,  // 30 minutes
      aiResults: 7200,    // 2 hours
      searches: 600,      // 10 minutes
      analytics: 3600     // 1 hour
    };
  }

  /**
   * Cache-aside pattern (lazy loading)
   */
  async cacheAside(key, fetchFunction, options = {}) {
    const ttl = options.ttl || this.defaultTTL.users;
    const useStaleWhileRevalidate = options.staleWhileRevalidate || false;
    const staleMultiplier = options.staleMultiplier || 2;

    try {
      // Try to get from cache
      let cached = await this.cache.get(key);
      
      if (cached !== null) {
        // Check if we should refresh in background (stale-while-revalidate)
        if (useStaleWhileRevalidate) {
          const keyTTL = await this.cache.ttl(key);
          const staleThreshold = ttl / staleMultiplier;
          
          if (keyTTL > 0 && keyTTL < staleThreshold) {
            // Refresh in background
            this.refreshInBackground(key, fetchFunction, ttl);
          }
        }
        
        loggerService.debug('Cache aside hit', { key });
        return cached;
      }

      // Cache miss - fetch data
      loggerService.debug('Cache aside miss, fetching data', { key });
      const data = await fetchFunction();
      
      if (data !== null && data !== undefined) {
        await this.cache.set(key, data, { ttl });
      }

      return data;
    } catch (error) {
      loggerService.error('Cache aside error', {
        key,
        error: error.message
      });
      
      // Fallback to direct fetch
      return await fetchFunction();
    }
  }

  /**
   * Write-through pattern
   */
  async writeThrough(key, data, persistFunction, options = {}) {
    const ttl = options.ttl || this.defaultTTL.users;

    try {
      // Write to persistent storage first
      const result = await persistFunction(data);
      
      // Then update cache
      await this.cache.set(key, result, { ttl });
      
      loggerService.debug('Write-through cache update', { key });
      return result;
    } catch (error) {
      loggerService.error('Write-through error', {
        key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Write-behind pattern (write-back)
   */
  async writeBehind(key, data, persistFunction, options = {}) {
    const ttl = options.ttl || this.defaultTTL.users;
    const delay = options.delay || 5000; // 5 seconds default delay

    try {
      // Update cache immediately
      await this.cache.set(key, data, { ttl });
      
      // Schedule background write
      setTimeout(async () => {
        try {
          await persistFunction(data);
          loggerService.debug('Write-behind persistence completed', { key });
        } catch (error) {
          loggerService.error('Write-behind persistence failed', {
            key,
            error: error.message
          });
          // Could implement retry logic here
        }
      }, delay);

      loggerService.debug('Write-behind cache updated', { key, delay });
      return data;
    } catch (error) {
      loggerService.error('Write-behind error', {
        key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cache warming strategy
   */
  async warmCache(warmingMap) {
    const results = [];
    
    for (const [key, config] of Object.entries(warmingMap)) {
      try {
        const startTime = Date.now();
        const data = await config.fetchFunction();
        const ttl = config.ttl || this.defaultTTL.users;
        
        await this.cache.set(key, data, { ttl });
        
        const duration = Date.now() - startTime;
        results.push({
          key,
          success: true,
          duration,
          dataSize: JSON.stringify(data).length
        });
        
        loggerService.debug('Cache warmed', { key, duration });
      } catch (error) {
        results.push({
          key,
          success: false,
          error: error.message
        });
        
        loggerService.error('Cache warming failed', {
          key,
          error: error.message
        });
      }
    }

    loggerService.info('Cache warming completed', {
      total: Object.keys(warmingMap).length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Multi-level cache strategy
   */
  async multiLevelCache(key, fetchFunction, levels = {}) {
    const l1TTL = levels.l1TTL || 300;  // 5 minutes
    const l2TTL = levels.l2TTL || 3600; // 1 hour
    
    try {
      // Try L1 cache (short TTL)
      const l1Key = `l1:${key}`;
      let data = await this.cache.get(l1Key);
      
      if (data !== null) {
        loggerService.debug('Multi-level cache L1 hit', { key });
        return data;
      }

      // Try L2 cache (longer TTL)
      const l2Key = `l2:${key}`;
      data = await this.cache.get(l2Key);
      
      if (data !== null) {
        // Populate L1 cache
        await this.cache.set(l1Key, data, { ttl: l1TTL });
        loggerService.debug('Multi-level cache L2 hit, populated L1', { key });
        return data;
      }

      // Cache miss - fetch data
      data = await fetchFunction();
      
      if (data !== null && data !== undefined) {
        // Populate both levels
        await Promise.all([
          this.cache.set(l1Key, data, { ttl: l1TTL }),
          this.cache.set(l2Key, data, { ttl: l2TTL })
        ]);
      }

      loggerService.debug('Multi-level cache miss, populated both levels', { key });
      return data;
    } catch (error) {
      loggerService.error('Multi-level cache error', {
        key,
        error: error.message
      });
      return await fetchFunction();
    }
  }

  /**
   * Cache invalidation patterns
   */
  async invalidateByTags(tags) {
    const patterns = tags.map(tag => `tag:${tag}:*`);
    let totalDeleted = 0;

    for (const pattern of patterns) {
      try {
        const deleted = await this.cache.delByPattern(pattern);
        totalDeleted += deleted;
      } catch (error) {
        loggerService.error('Tag invalidation error', {
          pattern,
          error: error.message
        });
      }
    }

    loggerService.info('Cache invalidated by tags', {
      tags,
      keysDeleted: totalDeleted
    });

    return totalDeleted;
  }

  /**
   * Invalidate related cache entries
   */
  async invalidateRelated(entityType, entityId) {
    const patterns = this.getInvalidationPatterns(entityType, entityId);
    let totalDeleted = 0;

    for (const pattern of patterns) {
      try {
        const deleted = await this.cache.delByPattern(pattern);
        totalDeleted += deleted;
      } catch (error) {
        loggerService.error('Related cache invalidation error', {
          pattern,
          error: error.message
        });
      }
    }

    loggerService.debug('Related cache invalidated', {
      entityType,
      entityId,
      patterns,
      keysDeleted: totalDeleted
    });

    return totalDeleted;
  }

  /**
   * Get invalidation patterns for entity types
   */
  getInvalidationPatterns(entityType, entityId) {
    const patterns = [];

    switch (entityType) {
      case 'patient':
        patterns.push(
          `patient:${entityId}:*`,
          `patient:${entityId}`,
          `patients:search:*`,
          `assignments:patient:${entityId}:*`,
          `ai:matches:patient:${entityId}:*`
        );
        break;

      case 'student':
        patterns.push(
          `student:${entityId}:*`,
          `student:${entityId}`,
          `students:search:*`,
          `assignments:student:${entityId}:*`,
          `ai:matches:student:${entityId}:*`
        );
        break;

      case 'assignment':
        patterns.push(
          `assignment:${entityId}:*`,
          `assignment:${entityId}`,
          `assignments:*`
        );
        break;

      case 'user':
        patterns.push(
          `user:${entityId}:*`,
          `user:${entityId}`,
          `users:*`
        );
        break;

      default:
        patterns.push(`${entityType}:${entityId}:*`);
    }

    return patterns;
  }

  /**
   * Refresh cache in background
   */
  refreshInBackground(key, fetchFunction, ttl) {
    setImmediate(async () => {
      try {
        const data = await fetchFunction();
        if (data !== null && data !== undefined) {
          await this.cache.set(key, data, { ttl });
          loggerService.debug('Background cache refresh completed', { key });
        }
      } catch (error) {
        loggerService.error('Background cache refresh failed', {
          key,
          error: error.message
        });
      }
    });
  }

  /**
   * Batch cache operations
   */
  async batchGet(keys, options = {}) {
    try {
      const values = await this.cache.mget(keys, options);
      const result = {};
      
      keys.forEach((key, index) => {
        result[key] = values[index];
      });

      return result;
    } catch (error) {
      loggerService.error('Batch cache get error', {
        keys,
        error: error.message
      });
      return {};
    }
  }

  /**
   * Batch cache set
   */
  async batchSet(keyValueMap, options = {}) {
    try {
      const keyValuePairs = Object.entries(keyValueMap);
      await this.cache.mset(keyValuePairs, options);
      
      loggerService.debug('Batch cache set completed', {
        count: keyValuePairs.length
      });

      return true;
    } catch (error) {
      loggerService.error('Batch cache set error', {
        count: Object.keys(keyValueMap).length,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Patient-specific cache strategies
   */
  async cachePatient(patientId, fetchFunction) {
    const key = `patient:${patientId}`;
    return await this.cacheAside(key, fetchFunction, {
      ttl: this.defaultTTL.patients,
      staleWhileRevalidate: true
    });
  }

  /**
   * Student-specific cache strategies
   */
  async cacheStudent(studentId, fetchFunction) {
    const key = `student:${studentId}`;
    return await this.cacheAside(key, fetchFunction, {
      ttl: this.defaultTTL.students,
      staleWhileRevalidate: true
    });
  }

  /**
   * AI matching results cache
   */
  async cacheAIResults(patientId, algorithm, fetchFunction) {
    const key = `ai:matches:${algorithm}:patient:${patientId}`;
    return await this.cacheAside(key, fetchFunction, {
      ttl: this.defaultTTL.aiResults
    });
  }

  /**
   * Search results cache with automatic invalidation
   */
  async cacheSearchResults(query, type, fetchFunction) {
    const queryHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(query))
      .digest('hex');
    
    const key = `search:${type}:${queryHash}`;
    
    return await this.cacheAside(key, fetchFunction, {
      ttl: this.defaultTTL.searches
    });
  }

  /**
   * Analytics cache with longer TTL
   */
  async cacheAnalytics(type, period, fetchFunction) {
    const key = `analytics:${type}:${period}`;
    return await this.cacheAside(key, fetchFunction, {
      ttl: this.defaultTTL.analytics
    });
  }

  /**
   * Cache middleware for Express routes
   */
  routeCache(options = {}) {
    const ttl = options.ttl || 300;
    const keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
    const condition = options.condition || (() => true);

    return async (req, res, next) => {
      // Skip caching if condition is not met
      if (!condition(req)) {
        return next();
      }

      const key = keyGenerator(req);
      
      try {
        const cached = await this.cache.get(key);
        
        if (cached !== null) {
          loggerService.debug('Route cache hit', { 
            key, 
            method: req.method, 
            path: req.path 
          });
          
          return res.json(cached);
        }

        // Override res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = (data) => {
          // Cache successful responses only
          if (res.statusCode === 200) {
            this.cache.set(key, data, { ttl })
              .catch(error => {
                loggerService.error('Route cache set error', {
                  key,
                  error: error.message
                });
              });
          }
          
          return originalJson(data);
        };

        next();
      } catch (error) {
        loggerService.error('Route cache middleware error', {
          key,
          error: error.message
        });
        next();
      }
    };
  }

  /**
   * Default cache key generator for routes
   */
  defaultKeyGenerator(req) {
    const url = req.originalUrl || req.url;
    const method = req.method;
    const userId = req.user?.id || 'anonymous';
    
    return `route:${method}:${url}:user:${userId}`;
  }

  /**
   * Cache statistics
   */
  getStrategiesStats() {
    return {
      defaultTTL: this.defaultTTL,
      cacheService: this.cache.getStats()
    };
  }
}

module.exports = CacheStrategies;