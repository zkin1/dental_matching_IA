/**
 * DENTAL MATCHING - RATE LIMITING & THROTTLING
 * Advanced rate limiting with Redis store and smart algorithms
 */

const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

class RateLimiterService {
  constructor() {
    // Initialize Redis for distributed rate limiting only if enabled
    this.redis = null;
    this.useRedis = process.env.REDIS_ENABLED === 'true' && process.env.NODE_ENV === 'production';
    
    if (this.useRedis) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error);
      });

      this.redis.on('connect', () => {
        console.log('Redis connected for rate limiting');
      });
    }
  }

  /**
   * Redis store for rate limiter (or in-memory fallback)
   */
  getRedisStore() {
    if (this.useRedis && this.redis) {
      return {
        incr: async (key) => {
          const result = await this.redis.multi()
            .incr(key)
            .expire(key, 3600) // 1 hour expiry
            .exec();
          return result[0][1];
        },
        
        decrement: async (key) => {
          return await this.redis.decr(key);
        },
        
        resetKey: async (key) => {
          return await this.redis.del(key);
        },
        
        getHits: async (key) => {
          const hits = await this.redis.get(key);
          return parseInt(hits) || 0;
        },
        
        getRemainingTime: async (key) => {
          return await this.redis.ttl(key);
        }
      };
    }
    
    // Return undefined to use express-rate-limit's default memory store
    return undefined;
  }

  /**
   * Generate rate limit key
   */
  generateKey(req, suffix = '') {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || 'anonymous';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Create composite key for better identification
    const baseKey = `rate_limit:${ip}:${userId}`;
    return suffix ? `${baseKey}:${suffix}` : baseKey;
  }

  /**
   * Smart key generator that considers user type
   */
  smartKeyGenerator(req) {
    const userType = req.user?.role || 'anonymous';
    const endpoint = req.route?.path || req.path;
    
    return `${this.generateKey(req)}:${userType}:${endpoint}`;
  }

  /**
   * Custom skip function for rate limiting
   */
  skipSuccessfulRequests(req, res) {
    return res.statusCode < 400;
  }

  /**
   * Custom skip for trusted IPs
   */
  skipTrustedIPs(req, res) {
    const trustedIPs = process.env.TRUSTED_IPS ? process.env.TRUSTED_IPS.split(',') : [];
    const clientIP = req.ip || req.connection.remoteAddress;
    
    return trustedIPs.includes(clientIP);
  }

  /**
   * Standard API rate limiter
   */
  standardLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 15 * 60 // 15 minutes in seconds
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      keyGenerator: (req) => this.generateKey(req, 'standard'),
      skip: this.skipTrustedIPs,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
          limit: req.rateLimit.limit,
          remaining: req.rateLimit.remaining
        });
      }
    });
  }

  /**
   * Strict limiter for sensitive endpoints
   */
  strictLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // only 5 attempts per 15 minutes
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded for sensitive operation.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      keyGenerator: (req) => this.generateKey(req, 'strict'),
      skip: this.skipTrustedIPs,
      handler: (req, res) => {
        // Log suspicious activity
        console.warn(`Strict rate limit exceeded for IP: ${req.ip}, User: ${req.user?.id || 'anonymous'}`);
        
        res.status(429).json({
          success: false,
          error: 'STRICT_RATE_LIMIT_EXCEEDED',
          message: 'Too many requests to sensitive endpoint. Account may be temporarily restricted.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  /**
   * Authentication rate limiter (login, register)
   */
  authLimiter() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 attempts per hour
      skipSuccessfulRequests: true, // Don't count successful logins
      message: {
        error: 'Too many authentication attempts',
        message: 'Account temporarily locked due to too many failed attempts.',
        retryAfter: 60 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      keyGenerator: (req) => this.generateKey(req, 'auth'),
      handler: (req, res) => {
        // Log security event
        console.warn(`Authentication rate limit exceeded for IP: ${req.ip}, Email: ${req.body?.email || 'unknown'}`);
        
        res.status(429).json({
          success: false,
          error: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts. Account temporarily locked.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
          lockoutDuration: '1 hour'
        });
      }
    });
  }

  /**
   * API key rate limiter (higher limits for authenticated users)
   */
  apiKeyLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: async (req) => {
        // Dynamic limits based on user role
        if (req.user?.role === 'admin') return 1000;
        if (req.user?.role === 'supervisor') return 500;
        if (req.user?.role === 'coordinator') return 200;
        return 50; // default for unauthenticated
      },
      message: {
        error: 'API rate limit exceeded',
        message: 'API rate limit exceeded for your account tier.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      keyGenerator: (req) => this.smartKeyGenerator(req),
      skip: this.skipTrustedIPs
    });
  }

  /**
   * File upload rate limiter
   */
  uploadLimiter() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 file uploads per hour
      message: {
        error: 'Upload rate limit exceeded',
        message: 'Too many file uploads. Please try again later.',
        retryAfter: 60 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      keyGenerator: (req) => this.generateKey(req, 'upload'),
      skip: (req) => {
        // Skip if no file uploaded
        return !req.file && !req.files;
      }
    });
  }

  /**
   * AI Matching rate limiter (resource intensive)
   */
  matchingLimiter() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 3, // only 3 matching requests per 10 minutes
      message: {
        error: 'Matching rate limit exceeded',
        message: 'AI matching is resource intensive. Please wait before requesting again.',
        retryAfter: 10 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      keyGenerator: (req) => this.generateKey(req, 'matching'),
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: 'MATCHING_RATE_LIMIT_EXCEEDED',
          message: 'AI matching rate limit exceeded. This operation is resource intensive.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
          suggestion: 'Consider batching multiple requests or upgrading your account.'
        });
      }
    });
  }

  /**
   * Search rate limiter
   */
  searchLimiter() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // 30 search requests per minute
      message: {
        error: 'Search rate limit exceeded',
        message: 'Too many search requests. Please slow down.',
        retryAfter: 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.getRedisStore(),
      keyGenerator: (req) => this.generateKey(req, 'search')
    });
  }

  /**
   * Progressive rate limiter (increases restrictions with violations)
   */
  progressiveLimiter() {
    return async (req, res, next) => {
      const key = this.generateKey(req, 'progressive');
      const violationsKey = `${key}:violations`;
      
      try {
        let currentViolations = 0;
        if (this.useRedis && this.redis) {
          const violations = await this.redis.get(violationsKey) || 0;
          currentViolations = parseInt(violations);
        }
        
        // Calculate dynamic limits based on violations
        let maxRequests = 100; // base limit
        let windowMs = 15 * 60 * 1000; // 15 minutes
        
        if (currentViolations > 5) {
          maxRequests = 20; // severely restricted
          windowMs = 60 * 60 * 1000; // 1 hour
        } else if (currentViolations > 2) {
          maxRequests = 50; // moderately restricted
          windowMs = 30 * 60 * 1000; // 30 minutes
        } else if (currentViolations > 0) {
          maxRequests = 75; // slightly restricted
        }
        
        // Apply dynamic rate limit
        const limiter = rateLimit({
          windowMs,
          max: maxRequests,
          store: this.getRedisStore(),
          keyGenerator: () => key,
          handler: async (req, res) => {
            // Increment violations if Redis available
            if (this.useRedis && this.redis) {
              await this.redis.incr(violationsKey);
              await this.redis.expire(violationsKey, 24 * 60 * 60); // 24 hours
            }
            
            res.status(429).json({
              success: false,
              error: 'PROGRESSIVE_RATE_LIMIT_EXCEEDED',
              message: `Rate limit exceeded. Restrictions increased due to ${currentViolations + 1} violations.`,
              violations: currentViolations + 1,
              retryAfter: Math.ceil(windowMs / 1000)
            });
          }
        });
        
        return limiter(req, res, next);
        
      } catch (error) {
        console.error('Progressive rate limiter error:', error);
        next(); // Continue without rate limiting on Redis error
      }
    };
  }

  /**
   * IP-based throttling middleware
   */
  ipThrottling() {
    const requestCounts = new Map();
    const WINDOW_SIZE = 60 * 1000; // 1 minute
    const MAX_REQUESTS = 60; // 60 requests per minute
    
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - WINDOW_SIZE;
      
      // Initialize or get existing request log
      if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
      }
      
      const requests = requestCounts.get(ip);
      
      // Remove old requests outside the window
      const recentRequests = requests.filter(timestamp => timestamp > windowStart);
      
      // Check if limit exceeded
      if (recentRequests.length >= MAX_REQUESTS) {
        return res.status(429).json({
          success: false,
          error: 'IP_THROTTLE_EXCEEDED',
          message: 'Request rate too high for this IP address.',
          limit: MAX_REQUESTS,
          window: '1 minute'
        });
      }
      
      // Add current request
      recentRequests.push(now);
      requestCounts.set(ip, recentRequests);
      
      // Cleanup old entries periodically
      if (Math.random() < 0.01) { // 1% chance
        this.cleanupOldEntries(requestCounts, windowStart);
      }
      
      next();
    };
  }

  /**
   * Cleanup old throttling entries
   */
  cleanupOldEntries(requestCounts, windowStart) {
    for (const [ip, requests] of requestCounts.entries()) {
      const recentRequests = requests.filter(timestamp => timestamp > windowStart);
      if (recentRequests.length === 0) {
        requestCounts.delete(ip);
      } else {
        requestCounts.set(ip, recentRequests);
      }
    }
  }

  /**
   * Get rate limit status for an IP
   */
  async getRateLimitStatus(req, suffix = 'standard') {
    if (!this.useRedis || !this.redis) {
      return null; // Not available without Redis
    }
    
    const key = this.generateKey(req, suffix);
    
    try {
      const hits = await this.redis.get(key) || 0;
      const ttl = await this.redis.ttl(key);
      
      return {
        key,
        hits: parseInt(hits),
        remaining: Math.max(0, 100 - parseInt(hits)),
        resetTime: ttl > 0 ? Date.now() + (ttl * 1000) : null
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(req, suffix = 'standard') {
    if (!this.useRedis || !this.redis) {
      return false; // Not available without Redis
    }
    
    const key = this.generateKey(req, suffix);
    
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return false;
    }
  }
}

module.exports = new RateLimiterService();