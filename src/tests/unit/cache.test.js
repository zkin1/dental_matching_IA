/**
 * DENTAL MATCHING - CACHE SERVICE TESTS
 * Unit tests for cache service (in-memory fallback mode)
 */

const cacheService = require('../../infrastructure/cache/cacheService');

describe('CacheService (in-memory mode)', () => {
  beforeAll(async () => {
    await cacheService.initialize();
  });

  afterAll(async () => {
    await cacheService.close();
  });

  beforeEach(() => {
    cacheService.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  });

  describe('get/set', () => {
    test('should set and get a value', async () => {
      const testData = { name: 'test', value: 123 };
      await cacheService.set('test-key', testData, { ttl: 600 });
      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
    });

    test('should return null for cache miss', async () => {
      const result = await cacheService.get('nonexistent-key');
      expect(result).toBeNull();
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
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });
});
