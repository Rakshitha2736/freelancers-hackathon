const { CacheManager, invalidateCache } = require('../utils/cacheManager');
const { schemas } = require('../middleware/security');
const { parseDeadline } = require('../utils/deadlineParser');

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

describe('Deadline Parser', () => {
  const baseDate = new Date('2026-02-20T10:00:00.000Z'); // Friday

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(baseDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const toDate = (value) => new Date(value);
  const dayDiff = (a, b) => {
    const msInDay = 24 * 60 * 60 * 1000;
    return Math.round((b.getTime() - a.getTime()) / msInDay);
  };

  test('today resolves to current date', () => {
    const parsed = toDate(parseDeadline('today'));
    expect(parsed.toDateString()).toBe(baseDate.toDateString());
  });

  test('tomorrow resolves to +1 day', () => {
    const parsed = toDate(parseDeadline('tomorrow'));
    expect(dayDiff(baseDate, parsed)).toBe(1);
  });

  test('within two days resolves to +2 days', () => {
    const parsed = toDate(parseDeadline('within two days'));
    expect(dayDiff(baseDate, parsed)).toBe(2);
  });

  test('eod resolves to same-day end of business', () => {
    const parsed = toDate(parseDeadline('eod'));
    expect(parsed.toDateString()).toBe(baseDate.toDateString());
    expect(parsed.getHours()).toBe(17);
  });

  test('end of day resolves to same-day end of business', () => {
    const parsed = toDate(parseDeadline('end of day'));
    expect(parsed.toDateString()).toBe(baseDate.toDateString());
    expect(parsed.getHours()).toBe(17);
  });

  test('next week resolves to +7 days', () => {
    const parsed = toDate(parseDeadline('next week'));
    expect(dayDiff(baseDate, parsed)).toBe(7);
  });

  test('end of month resolves to last day of month', () => {
    const parsed = toDate(parseDeadline('end of month'));
    expect(parsed.getUTCFullYear()).toBe(2026);
    expect(parsed.getUTCMonth()).toBe(1); // February
    expect(parsed.getUTCDate()).toBe(28);
  });

  test('this weekend resolves to Saturday', () => {
    const parsed = toDate(parseDeadline('this weekend'));
    expect(parsed.getDay()).toBe(6);
  });

  test('next Monday resolves to upcoming Monday', () => {
    const parsed = toDate(parseDeadline('next Monday'));
    expect(parsed.getDay()).toBe(1);
    expect(dayDiff(baseDate, parsed)).toBeGreaterThanOrEqual(3);
  });

  test('by Wednesday resolves to upcoming Wednesday', () => {
    const parsed = toDate(parseDeadline('by Wednesday'));
    expect(parsed.getDay()).toBe(3);
  });

  test('by Friday evening resolves to Friday evening', () => {
    const parsed = toDate(parseDeadline('by Friday evening'));
    expect(parsed.getDay()).toBe(5);
    expect(parsed.getHours()).toBe(18);
  });

  test('in the next sprint resolves to +14 days', () => {
    const parsed = toDate(parseDeadline('in the next sprint'));
    expect(dayDiff(baseDate, parsed)).toBe(14);
  });

  test('before release resolves to +7 days', () => {
    const parsed = toDate(parseDeadline('before release'));
    expect(dayDiff(baseDate, parsed)).toBe(7);
  });

  test('returns null when parsing fails', () => {
    const parsed = parseDeadline('unrecognized phrase');
    expect(parsed).toBeNull();
  });
});
