/**
 * DENTAL MATCHING - DISTRIBUTED CACHE SERVICE
 * Redis-based caching with advanced features
 */

const Redis = require('ioredis');
const loggerService = require('../logging/logger');
const crypto = require('crypto');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: process.env.REDIS_DB || 0,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'dental:',
      maxRetriesPerRequest: 3, // Allow up to 3 retries
      retryDelayOnFailover: 1000,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 5000, // 5 seconds timeout
      autoResubscribe: false,
      autoResendUnfulfilledCommands: false,
      maxRetriesPerRequest: 3 // Consistent retry setting
    };
    
    // Default TTL values (in seconds)
    this.defaultTTL = {
      short: 300,      // 5 minutes
      medium: 3600,    // 1 hour
      long: 86400,     // 1 day
      extended: 604800 // 1 week
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      // Initialize in-memory cache first as fallback
      this.inMemoryCache = new Map();
      this.isConnected = false;
      
      // Only try Redis if explicitly enabled and not in development
      if (process.env.REDIS_ENABLED === 'true' && process.env.NODE_ENV === 'production') {
        this.redis = new Redis({
          ...this.config,
          maxRetriesPerRequest: 1, // Reduce retries to prevent spam
          retryDelayOnFailover: 100,
          enableOfflineQueue: false,
          lazyConnect: true,
          connectTimeout: 2000, // Shorter timeout
          autoResubscribe: false,
          autoResendUnfulfilledCommands: false,
          disconnectTimeout: 1000
        });
        
        // Setup event handlers with improved error handling
        this.setupEventHandlers();
      }
      
      loggerService.info('Cache service initialized with in-memory fallback', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix
      });

      // Start monitoring
      this.startMonitoring();
      
    } catch (error) {
      loggerService.warn('Cache service using in-memory fallback only', {
        error: error.message
      });
      
      // Ensure in-memory fallback is ready
      this.inMemoryCache = new Map();
      this.isConnected = false;
      this.redis = null;
    }
  }

  /**
   * Setup Redis event handlers
   */
  setupEventHandlers() {
    let connectionLogged = false;
    let lastReconnectTime = 0;
    const reconnectLogInterval = 30000; // Only log reconnect every 30 seconds

    this.redis.on('connect', () => {
      this.isConnected = true;
      if (!connectionLogged) {
        loggerService.info('Redis connection established');
        connectionLogged = true;
      }
    });

    this.redis.on('ready', () => {
      if (!connectionLogged) {
        loggerService.info('Redis is ready to receive commands');
        connectionLogged = true;
      }
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      this.stats.errors++;
      // Only log first error and then suppress for 30 seconds
      const now = Date.now();
      if (now - lastReconnectTime > reconnectLogInterval) {
        loggerService.warn('Redis connection error handled gracefully', {
          error: error.message,
          type: 'redis_connection_error'
        });
        lastReconnectTime = now;
      }
      
      // Prevent unhandled promise rejection by catching common Redis errors
      if (error.message && error.message.includes('maxRetriesPerRequest')) {
        console.log('⚠️  Redis connection issue (non-fatal):', error.message);
        // Don't rethrow - let it fallback gracefully
        return;
      }
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      const now = Date.now();
      if (connectionLogged && now - lastReconnectTime > reconnectLogInterval) {
        loggerService.warn('Redis connection closed');
        lastReconnectTime = now;
      }
    });

    this.redis.on('reconnecting', () => {
      const now = Date.now();
      if (now - lastReconnectTime > reconnectLogInterval) {
        loggerService.info('Redis reconnecting... (will suppress similar logs for 30s)');
        lastReconnectTime = now;
      }
    });
  }

  /**
   * Get value from cache
   */
  async get(key, options = {}) {
    if (!this.isConnected && !this.inMemoryCache) {
      loggerService.warn('Cache not available, skipping get operation', { key });
      return null;
    }

    try {
      const fullKey = this.buildKey(key);
      const startTime = Date.now();
      
      let value;
      
      if (this.isConnected) {
        value = await this.redis.get(fullKey);
      } else {
        // Use in-memory fallback
        const cached = this.inMemoryCache.get(fullKey);
        if (cached && Date.now() < cached.expires) {
          value = cached.value;
        } else {
          if (cached) this.inMemoryCache.delete(fullKey);
          value = null;
        }
      }
      
      const duration = Date.now() - startTime;
      
      if (value === null) {
        this.stats.misses++;
        loggerService.debug('Cache miss', { key, duration });
        return null;
      }

      this.stats.hits++;
      
      // Parse JSON if needed
      if (options.parse !== false && typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (parseError) {
          // Value is not JSON, return as string
        }
      }

      loggerService.debug('Cache hit', { 
        key, 
        duration,
        valueType: typeof value 
      });

      return value;
    } catch (error) {
      this.stats.errors++;
      loggerService.error('Cache get error', {
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, options = {}) {
    if (!this.isConnected && !this.inMemoryCache) {
      loggerService.warn('Cache not available, skipping set operation', { key });
      return false;
    }

    try {
      const fullKey = this.buildKey(key);
      const ttl = options.ttl || this.defaultTTL.medium;
      const startTime = Date.now();

      // Serialize value
      const serializedValue = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);

      if (this.isConnected) {
        // Set with expiration
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else {
        // Use in-memory fallback
        this.inMemoryCache.set(fullKey, {
          value: serializedValue,
          expires: Date.now() + (ttl * 1000)
        });
      }
      
      const duration = Date.now() - startTime;
      this.stats.sets++;

      loggerService.debug('Cache set', {
        key,
        ttl,
        duration,
        valueSize: serializedValue.length
      });

      return true;
    } catch (error) {
      this.stats.errors++;
      loggerService.error('Cache set error', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key);
      const result = await this.redis.del(fullKey);
      
      if (result > 0) {
        this.stats.deletes++;
        loggerService.debug('Cache delete', { key });
      }

      return result > 0;
    } catch (error) {
      this.stats.errors++;
      loggerService.error('Cache delete error', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      loggerService.error('Cache exists check error', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key) {
    if (!this.isConnected) {
      return -1;
    }

    try {
      const fullKey = this.buildKey(key);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      loggerService.error('Cache TTL check error', {
        key,
        error: error.message
      });
      return -1;
    }
  }

  /**
   * Increment numeric value
   */
  async incr(key, amount = 1, options = {}) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key);
      let result;

      if (amount === 1) {
        result = await this.redis.incr(fullKey);
      } else {
        result = await this.redis.incrby(fullKey, amount);
      }

      // Set expiration if provided
      if (options.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      loggerService.error('Cache increment error', {
        key,
        amount,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys, options = {}) {
    if (!this.isConnected || keys.length === 0) {
      return [];
    }

    try {
      const fullKeys = keys.map(key => this.buildKey(key));
      const values = await this.redis.mget(fullKeys);
      
      return values.map((value, index) => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }

        this.stats.hits++;

        // Parse JSON if needed
        if (options.parse !== false) {
          try {
            return JSON.parse(value);
          } catch (parseError) {
            return value;
          }
        }

        return value;
      });
    } catch (error) {
      this.stats.errors++;
      loggerService.error('Cache mget error', {
        keys,
        error: error.message
      });
      return new Array(keys.length).fill(null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs, options = {}) {
    if (!this.isConnected || keyValuePairs.length === 0) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();
      const ttl = options.ttl || this.defaultTTL.medium;

      for (const [key, value] of keyValuePairs) {
        const fullKey = this.buildKey(key);
        const serializedValue = typeof value === 'string' 
          ? value 
          : JSON.stringify(value);
        
        pipeline.setex(fullKey, ttl, serializedValue);
      }

      await pipeline.exec();
      this.stats.sets += keyValuePairs.length;

      loggerService.debug('Cache mset', {
        count: keyValuePairs.length,
        ttl
      });

      return true;
    } catch (error) {
      this.stats.errors++;
      loggerService.error('Cache mset error', {
        count: keyValuePairs.length,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  async delByPattern(pattern) {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(keys);
      this.stats.deletes += result;

      loggerService.debug('Cache pattern delete', {
        pattern,
        keysDeleted: result
      });

      return result;
    } catch (error) {
      this.stats.errors++;
      loggerService.error('Cache pattern delete error', {
        pattern,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Cache wrapper for functions
   */
  async wrap(key, fn, options = {}) {
    // Try to get from cache first
    let value = await this.get(key, options);
    
    if (value !== null) {
      return value;
    }

    // Execute function and cache result
    try {
      value = await fn();
      
      if (value !== null && value !== undefined) {
        await this.set(key, value, options);
      }
      
      return value;
    } catch (error) {
      loggerService.error('Cache wrap function error', {
        key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Distributed lock implementation
   */
  async acquireLock(resource, ttl = 10000, retries = 10) {
    const lockKey = this.buildKey(`lock:${resource}`);
    const lockValue = crypto.randomUUID();
    const retryDelay = 100;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await this.redis.set(
          lockKey, 
          lockValue, 
          'PX', 
          ttl, 
          'NX'
        );

        if (result === 'OK') {
          loggerService.debug('Lock acquired', {
            resource,
            lockValue,
            ttl,
            attempt
          });

          return {
            acquired: true,
            lockValue,
            release: async () => {
              return await this.releaseLock(resource, lockValue);
            }
          };
        }

        // Wait before retry
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

      } catch (error) {
        loggerService.error('Lock acquisition error', {
          resource,
          attempt,
          error: error.message
        });
      }
    }

    return { acquired: false };
  }

  /**
   * Release distributed lock
   */
  async releaseLock(resource, lockValue) {
    const lockKey = this.buildKey(`lock:${resource}`);
    
    try {
      // Use Lua script for atomic check and delete
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(script, 1, lockKey, lockValue);
      
      loggerService.debug('Lock released', {
        resource,
        lockValue,
        success: result === 1
      });

      return result === 1;
    } catch (error) {
      loggerService.error('Lock release error', {
        resource,
        lockValue,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: parseFloat(hitRate),
      isConnected: this.isConnected,
      uptime: this.isConnected ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    this.startTime = Date.now();
    
    // Log stats every 5 minutes
    setInterval(() => {
      const stats = this.getStats();
      loggerService.info('Cache statistics', stats);
    }, 5 * 60 * 1000);
  }

  /**
   * Build full cache key
   */
  buildKey(key) {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const start = Date.now();
      
      if (this.isConnected) {
        await this.redis.ping();
        const responseTime = Date.now() - start;
        
        const info = await this.redis.info('memory');
        const memoryMatch = info.match(/used_memory:(\d+)/);
        const usedMemory = memoryMatch ? parseInt(memoryMatch[1]) : 0;

        return {
          status: 'healthy',
          responseTime,
          isConnected: this.isConnected,
          stats: this.getStats(),
          memory: {
            used: usedMemory,
            usedHuman: this.formatBytes(usedMemory)
          }
        };
      } else {
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime,
          isConnected: false,
          fallbackMode: 'in-memory',
          stats: this.getStats(),
          memory: {
            used: this.inMemoryCache ? this.inMemoryCache.size * 100 : 0,
            usedHuman: this.inMemoryCache ? `${this.inMemoryCache.size} items` : '0 items'
          }
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        isConnected: this.isConnected,
        stats: this.getStats()
      };
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Close connection
   */
  async close() {
    if (this.redis) {
      await this.redis.disconnect();
      this.isConnected = false;
      loggerService.info('Cache service connection closed');
    }
  }

  /**
   * Express middleware
   */
  middleware() {
    return (req, res, next) => {
      req.cache = this;
      next();
    };
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;