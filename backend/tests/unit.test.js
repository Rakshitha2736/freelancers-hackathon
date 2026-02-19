const { CacheManager, invalidateCache } = require('../utils/cacheManager');
const { schemas } = require('../middleware/security');

describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager();
  });

  test('should set and get values', () => {
    cache.set('key1', { data: 'value' });
    const result = cache.get('key1');
    expect(result).toEqual({ data: 'value' });
  });

  test('should return null for non-existent key', () => {
    const result = cache.get('nonexistent');
    expect(result).toBeNull();
  });

  test('should expire values after TTL', async () => {
    cache.set('key2', 'value', 1); // 1 second TTL
    expect(cache.get('key2')).toEqual('value');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(cache.get('key2')).toBeNull();
  });

  test('should delete values', () => {
    cache.set('key3', 'value');
    cache.delete('key3');
    expect(cache.get('key3')).toBeNull();
  });

  test('should clear all values', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.getStats().size).toBe(0);
  });

  test('should return cache stats', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.keys).toContain('key1');
  });
});

describe('Input Validation Schemas', () => {
  describe('task schema', () => {
    it('should validate valid task', () => {
      const task = {
        description: 'Test task',
        owner: 'John Doe',
        priority: 'High',
        deadline: '2025-03-01T00:00:00Z'
      };
      
      const result = schemas.task(task);
      expect(result.description).toBe('Test task');
      expect(result.priority).toBe('High');
    });

    it('should reject missing description', () => {
      expect(() => schemas.task({ owner: 'John' }))
        .toThrow('Task description required');
    });

    it('should reject invalid priority', () => {
      expect(() => schemas.task({
        description: 'Test',
        priority: 'Urgent'
      })).toThrow('Invalid priority');
    });

    it('should sanitize description', () => {
      const task = {
        description: '  Test task with spaces  '.padEnd(600),
        owner: 'John'
      };
      
      const result = schemas.task(task);
      expect(result.description.length).toBeLessThanOrEqual(500);
    });
  });

  describe('email schema', () => {
    it('should validate correct email', () => {
      const email = schemas.email('user@example.com');
      expect(email).toBe('user@example.com');
    });

    it('should reject invalid email', () => {
      expect(() => schemas.email('not-an-email'))
        .toThrow('Invalid email address');
    });

    it('should normalize email', () => {
      const email = schemas.email('User@EXAMPLE.COM');
      expect(email).toBe('user@example.com');
    });
  });

  describe('rawText schema', () => {
    it('should validate valid text', () => {
      const text = 'This is a valid meeting transcript with enough content.';
      const result = schemas.rawText(text);
      expect(result).toBeDefined();
    });

    it('should reject short text', () => {
      expect(() => schemas.rawText('Short'))
        .toThrow('Text must be at least 50 characters');
    });

    it('should truncate very long text', () => {
      const longText = 'a'.repeat(150000);
      const result = schemas.rawText(longText);
      expect(result.length).toBeLessThanOrEqual(100000);
    });
  });
});

describe('Cache Invalidation', () => {
  test('should invalidate matching patterns', () => {
    const cache = new CacheManager();
    cache.set('user:123', 'data1');
    cache.set('user:456', 'data2');
    cache.set('task:123', 'data3');

    invalidateCache(cache, '^user:');
    
    expect(cache.get('user:123')).toBeNull();
    expect(cache.get('user:456')).toBeNull();
    expect(cache.get('task:123')).toBeDefined();
  });
});
