/**
 * DENTAL MATCHING - CACHE SERVICE TESTS
 * Unit tests for Redis cache service and strategies
 */

const { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } = require('@jest/globals');
const CacheService = require('../../infrastructure/cache/cacheService');
const CacheStrategies = require('../../infrastructure/cache/cacheStrategies');

// Mock Redis
jest.mock('ioredis', () => {
  const mockRedis = {
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(300),
    incr: jest.fn().mockResolvedValue(1),
    incrby: jest.fn().mockResolvedValue(5),
    mget: jest.fn(),
    mset: jest.fn().mockResolvedValue('OK'),
    keys: jest.fn().mockResolvedValue([]),
    expire: jest.fn().mockResolvedValue(1),
    eval: jest.fn().mockResolvedValue(1),
    pipeline: jest.fn(() => ({
      setex: jest.fn(),
      exec: jest.fn().mockResolvedValue([])
    })),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn()
  };

  return jest.fn(() => mockRedis);
});

describe('CacheService', () => {
  let cacheService;
  let mockRedis;

  beforeAll(async () => {
    cacheService = new CacheService();
    await cacheService.initialize();
    mockRedis = cacheService.redis;
  });

  afterAll(async () => {
    await cacheService.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      expect(cacheService.isConnected).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    test('should setup event handlers', () => {
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('get method', () => {
    test('should get value from cache and parse JSON', async () => {
      const testData = { name: 'test', value: 123 };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test-key');

      expect(mockRedis.get).toHaveBeenCalledWith('dental:test-key');
      expect(result).toEqual(testData);
      expect(cacheService.stats.hits).toBe(1);
    });

    test('should return null for cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent-key');

      expect(result).toBeNull();
      expect(cacheService.stats.misses).toBe(1);
    });

    test('should return string for non-JSON values', async () => {
      mockRedis.get.mockResolvedValue('simple-string');

      const result = await cacheService.get('string-key');

      expect(result).toBe('simple-string');
      expect(cacheService.stats.hits).toBe(1);
    });

    test('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.get('error-key');

      expect(result).toBeNull();
      expect(cacheService.stats.errors).toBe(1);
    });

    test('should skip operation when not connected', async () => {
      cacheService.isConnected = false;

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });
  });

  describe('set method', () => {
    test('should set value with TTL', async () => {
      const testData = { name: 'test', value: 123 };

      const result = await cacheService.set('test-key', testData, { ttl: 600 });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'dental:test-key',
        600,
        JSON.stringify(testData)
      );
      expect(result).toBe(true);
      expect(cacheService.stats.sets).toBe(1);
    });

    test('should use default TTL when not specified', async () => {
      await cacheService.set('test-key', 'test-value');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'dental:test-key',
        3600, // medium TTL
        'test-value'
      );
    });

    test('should handle string values without JSON serialization', async () => {
      await cacheService.set('string-key', 'simple-string');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'dental:string-key',
        3600,
        'simple-string'
      );
    });

    test('should handle Redis errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.set('error-key', 'test-value');

      expect(result).toBe(false);
      expect(cacheService.stats.errors).toBe(1);
    });
  });

  describe('del method', () => {
    test('should delete key successfully', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.del('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('dental:test-key');
      expect(result).toBe(true);
      expect(cacheService.stats.deletes).toBe(1);
    });

    test('should return false when key does not exist', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await cacheService.del('nonexistent-key');

      expect(result).toBe(false);
      expect(cacheService.stats.deletes).toBe(0);
    });
  });

  describe('exists method', () => {
    test('should check if key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(mockRedis.exists).toHaveBeenCalledWith('dental:test-key');
      expect(result).toBe(true);
    });

    test('should return false for non-existent key', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await cacheService.exists('nonexistent-key');

      expect(result).toBe(false);
    });
  });

  describe('incr method', () => {
    test('should increment by 1 by default', async () => {
      mockRedis.incr.mockResolvedValue(5);

      const result = await cacheService.incr('counter-key');

      expect(mockRedis.incr).toHaveBeenCalledWith('dental:counter-key');
      expect(result).toBe(5);
    });

    test('should increment by specified amount', async () => {
      mockRedis.incrby.mockResolvedValue(15);

      const result = await cacheService.incr('counter-key', 10);

      expect(mockRedis.incrby).toHaveBeenCalledWith('dental:counter-key', 10);
      expect(result).toBe(15);
    });

    test('should set TTL when provided', async () => {
      mockRedis.incr.mockResolvedValue(1);

      await cacheService.incr('counter-key', 1, { ttl: 300 });

      expect(mockRedis.expire).toHaveBeenCalledWith('dental:counter-key', 300);
    });
  });

  describe('mget method', () => {
    test('should get multiple keys and parse JSON', async () => {
      const data1 = { id: 1, name: 'test1' };
      const data2 = { id: 2, name: 'test2' };
      
      mockRedis.mget.mockResolvedValue([
        JSON.stringify(data1),
        JSON.stringify(data2),
        null
      ]);

      const result = await cacheService.mget(['key1', 'key2', 'key3']);

      expect(mockRedis.mget).toHaveBeenCalledWith([
        'dental:key1',
        'dental:key2',
        'dental:key3'
      ]);
      expect(result).toEqual([data1, data2, null]);
      expect(cacheService.stats.hits).toBe(2);
      expect(cacheService.stats.misses).toBe(1);
    });

    test('should return empty array for empty keys', async () => {
      const result = await cacheService.mget([]);

      expect(result).toEqual([]);
      expect(mockRedis.mget).not.toHaveBeenCalled();
    });
  });

  describe('mset method', () => {
    test('should set multiple key-value pairs', async () => {
      const pipeline = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(pipeline);

      const keyValuePairs = [
        ['key1', { id: 1 }],
        ['key2', { id: 2 }]
      ];

      const result = await cacheService.mset(keyValuePairs, { ttl: 600 });

      expect(pipeline.setex).toHaveBeenCalledWith(
        'dental:key1',
        600,
        JSON.stringify({ id: 1 })
      );
      expect(pipeline.setex).toHaveBeenCalledWith(
        'dental:key2',
        600,
        JSON.stringify({ id: 2 })
      );
      expect(pipeline.exec).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(cacheService.stats.sets).toBe(2);
    });
  });

  describe('wrap method', () => {
    test('should return cached value if exists', async () => {
      const cachedData = { id: 1, name: 'cached' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const fetchFn = jest.fn();
      const result = await cacheService.wrap('wrap-key', fetchFn);

      expect(result).toEqual(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    test('should fetch and cache value if not exists', async () => {
      const fetchedData = { id: 1, name: 'fetched' };
      mockRedis.get.mockResolvedValue(null);

      const fetchFn = jest.fn().mockResolvedValue(fetchedData);
      const result = await cacheService.wrap('wrap-key', fetchFn);

      expect(fetchFn).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'dental:wrap-key',
        3600,
        JSON.stringify(fetchedData)
      );
      expect(result).toEqual(fetchedData);
    });

    test('should not cache null or undefined values', async () => {
      mockRedis.get.mockResolvedValue(null);

      const fetchFn = jest.fn().mockResolvedValue(null);
      const result = await cacheService.wrap('wrap-key', fetchFn);

      expect(result).toBeNull();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('distributed lock', () => {
    test('should acquire lock successfully', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const lock = await cacheService.acquireLock('resource', 10000, 3);

      expect(lock.acquired).toBe(true);
      expect(lock.lockValue).toBeDefined();
      expect(lock.release).toBeInstanceOf(Function);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'dental:lock:resource',
        expect.any(String),
        'PX',
        10000,
        'NX'
      );
    });

    test('should fail to acquire lock after retries', async () => {
      mockRedis.set.mockResolvedValue(null);

      const lock = await cacheService.acquireLock('resource', 1000, 2);

      expect(lock.acquired).toBe(false);
      expect(mockRedis.set).toHaveBeenCalledTimes(2);
    });

    test('should release lock successfully', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const result = await cacheService.releaseLock('resource', 'test-value');

      expect(result).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('if redis.call("get", KEYS[1]) == ARGV[1]'),
        1,
        'dental:lock:resource',
        'test-value'
      );
    });
  });

  describe('health check', () => {
    test('should return healthy status', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockResolvedValue('used_memory:1048576');

      const health = await cacheService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.responseTime).toBeDefined();
      expect(health.isConnected).toBe(true);
      expect(health.memory).toBeDefined();
    });

    test('should return unhealthy status on error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const health = await cacheService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Connection failed');
    });
  });

  describe('statistics', () => {
    test('should calculate hit rate correctly', () => {
      cacheService.stats.hits = 80;
      cacheService.stats.misses = 20;

      const stats = cacheService.getStats();

      expect(stats.hitRate).toBe(80);
    });

    test('should handle zero operations', () => {
      cacheService.stats.hits = 0;
      cacheService.stats.misses = 0;

      const stats = cacheService.getStats();

      expect(stats.hitRate).toBe(0);
    });
  });
});

describe('CacheStrategies', () => {
  let cacheService;
  let cacheStrategies;
  let mockRedis;

  beforeAll(async () => {
    cacheService = new CacheService();
    await cacheService.initialize();
    cacheStrategies = new CacheStrategies(cacheService);
    mockRedis = cacheService.redis;
  });

  afterAll(async () => {
    await cacheService.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheAside', () => {
    test('should return cached data on hit', async () => {
      const cachedData = { id: 1, name: 'cached' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const fetchFn = jest.fn();
      const result = await cacheStrategies.cacheAside('test-key', fetchFn);

      expect(result).toEqual(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    test('should fetch and cache data on miss', async () => {
      const fetchedData = { id: 1, name: 'fetched' };
      mockRedis.get.mockResolvedValue(null);

      const fetchFn = jest.fn().mockResolvedValue(fetchedData);
      const result = await cacheStrategies.cacheAside('test-key', fetchFn);

      expect(fetchFn).toHaveBeenCalled();
      expect(result).toEqual(fetchedData);
    });

    test('should implement stale-while-revalidate', async () => {
      const staleData = { id: 1, name: 'stale' };
      mockRedis.get.mockResolvedValue(JSON.stringify(staleData));
      mockRedis.ttl.mockResolvedValue(150); // Below stale threshold

      const fetchFn = jest.fn().mockResolvedValue({ id: 1, name: 'fresh' });
      const result = await cacheStrategies.cacheAside('test-key', fetchFn, {
        ttl: 600,
        staleWhileRevalidate: true
      });

      expect(result).toEqual(staleData); // Returns stale data immediately
      
      // Wait for background refresh
      await global.testUtils.wait(100);
      expect(fetchFn).toHaveBeenCalled();
    });
  });

  describe('writeThrough', () => {
    test('should write to storage and update cache', async () => {
      const data = { id: 1, name: 'test' };
      const persistFn = jest.fn().mockResolvedValue(data);

      const result = await cacheStrategies.writeThrough('test-key', data, persistFn);

      expect(persistFn).toHaveBeenCalledWith(data);
      expect(mockRedis.setex).toHaveBeenCalled();
      expect(result).toEqual(data);
    });

    test('should handle persistence errors', async () => {
      const data = { id: 1, name: 'test' };
      const persistFn = jest.fn().mockRejectedValue(new Error('Persistence failed'));

      await expect(
        cacheStrategies.writeThrough('test-key', data, persistFn)
      ).rejects.toThrow('Persistence failed');
    });
  });

  describe('writeBehind', () => {
    test('should update cache immediately and persist in background', async () => {
      const data = { id: 1, name: 'test' };
      const persistFn = jest.fn().mockResolvedValue(data);

      const result = await cacheStrategies.writeBehind('test-key', data, persistFn, {
        delay: 100
      });

      expect(mockRedis.setex).toHaveBeenCalled();
      expect(result).toEqual(data);
      expect(persistFn).not.toHaveBeenCalled(); // Not called immediately

      // Wait for background persistence
      await global.testUtils.wait(150);
      expect(persistFn).toHaveBeenCalledWith(data);
    });
  });

  describe('multiLevelCache', () => {
    test('should check L1 cache first', async () => {
      const cachedData = { id: 1, name: 'l1-cached' };
      mockRedis.get.mockImplementation((key) => {
        if (key === 'dental:l1:test-key') {
          return Promise.resolve(JSON.stringify(cachedData));
        }
        return Promise.resolve(null);
      });

      const fetchFn = jest.fn();
      const result = await cacheStrategies.multiLevelCache('test-key', fetchFn);

      expect(result).toEqual(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    test('should check L2 cache and populate L1', async () => {
      const l2Data = { id: 1, name: 'l2-cached' };
      mockRedis.get.mockImplementation((key) => {
        if (key === 'dental:l1:test-key') {
          return Promise.resolve(null);
        }
        if (key === 'dental:l2:test-key') {
          return Promise.resolve(JSON.stringify(l2Data));
        }
        return Promise.resolve(null);
      });

      const fetchFn = jest.fn();
      const result = await cacheStrategies.multiLevelCache('test-key', fetchFn);

      expect(result).toEqual(l2Data);
      expect(fetchFn).not.toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'dental:l1:test-key',
        300,
        JSON.stringify(l2Data)
      );
    });

    test('should fetch data and populate both levels on miss', async () => {
      const fetchedData = { id: 1, name: 'fetched' };
      mockRedis.get.mockResolvedValue(null);

      const fetchFn = jest.fn().mockResolvedValue(fetchedData);
      const result = await cacheStrategies.multiLevelCache('test-key', fetchFn);

      expect(fetchFn).toHaveBeenCalled();
      expect(result).toEqual(fetchedData);
      expect(mockRedis.setex).toHaveBeenCalledTimes(2); // L1 and L2
    });
  });

  describe('cache warming', () => {
    test('should warm multiple cache entries', async () => {
      const warmingMap = {
        'key1': {
          fetchFunction: jest.fn().mockResolvedValue({ id: 1 }),
          ttl: 600
        },
        'key2': {
          fetchFunction: jest.fn().mockResolvedValue({ id: 2 }),
          ttl: 1200
        }
      };

      const results = await cacheStrategies.warmCache(warmingMap);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledTimes(2);
    });

    test('should handle warming failures gracefully', async () => {
      const warmingMap = {
        'success-key': {
          fetchFunction: jest.fn().mockResolvedValue({ id: 1 })
        },
        'error-key': {
          fetchFunction: jest.fn().mockRejectedValue(new Error('Fetch failed'))
        }
      };

      const results = await cacheStrategies.warmCache(warmingMap);

      expect(results).toHaveLength(2);
      expect(results.find(r => r.key === 'success-key').success).toBe(true);
      expect(results.find(r => r.key === 'error-key').success).toBe(false);
    });
  });

  describe('invalidation', () => {
    test('should invalidate by tags', async () => {
      mockRedis.keys.mockResolvedValue(['dental:tag:user:key1', 'dental:tag:user:key2']);
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheStrategies.invalidateByTags(['user']);

      expect(mockRedis.keys).toHaveBeenCalledWith('tag:user:*');
      expect(result).toBe(2);
    });

    test('should invalidate related entries', async () => {
      mockRedis.delByPattern = jest.fn().mockResolvedValue(5);
      cacheService.delByPattern = jest.fn().mockResolvedValue(5);

      const result = await cacheStrategies.invalidateRelated('patient', 123);

      expect(result).toBe(0); // Since delByPattern is mocked on service level
    });
  });

  describe('domain-specific methods', () => {
    test('should cache patient data', async () => {
      const patientData = { id: 1, name: 'Patient' };
      mockRedis.get.mockResolvedValue(null);

      const fetchFn = jest.fn().mockResolvedValue(patientData);
      const result = await cacheStrategies.cachePatient(1, fetchFn);

      expect(result).toEqual(patientData);
    });

    test('should cache AI results', async () => {
      const aiResults = [{ studentId: 1, score: 0.85 }];
      mockRedis.get.mockResolvedValue(null);

      const fetchFn = jest.fn().mockResolvedValue(aiResults);
      const result = await cacheStrategies.cacheAIResults(1, 'neural_network', fetchFn);

      expect(result).toEqual(aiResults);
    });

    test('should cache search results with query hash', async () => {
      const query = { type: 'ortodoncia', status: 'active' };
      const searchResults = [{ id: 1 }, { id: 2 }];
      mockRedis.get.mockResolvedValue(null);

      const fetchFn = jest.fn().mockResolvedValue(searchResults);
      const result = await cacheStrategies.cacheSearchResults(query, 'patients', fetchFn);

      expect(result).toEqual(searchResults);
    });
  });

  describe('route cache middleware', () => {
    test('should cache successful route responses', async () => {
      const req = global.testUtils.mockRequest({
        originalUrl: '/api/patients',
        method: 'GET',
        user: { id: 1 }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      mockRedis.get.mockResolvedValue(null);

      const middleware = cacheStrategies.routeCache({ ttl: 600 });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      
      // Simulate successful response
      res.statusCode = 200;
      const responseData = { patients: [] };
      res.json(responseData);

      // Should attempt to cache the response
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    test('should return cached response directly', async () => {
      const cachedResponse = { patients: [{ id: 1 }] };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

      const req = global.testUtils.mockRequest({
        originalUrl: '/api/patients',
        method: 'GET'
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      const middleware = cacheStrategies.routeCache();
      await middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(cachedResponse);
      expect(next).not.toHaveBeenCalled();
    });
  });
});