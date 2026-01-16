import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Get JSON value from cache
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      // If parsing fails, delete the corrupted cache entry
      await this.del(key);
      return null;
    }
  }

  /**
   * Set JSON value in cache
   */
  async setJSON(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, ttl);
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    return this.redis.del(...keys);
  }

  /**
   * Acquire a distributed lock for temporary booking operations
   * @param key - Lock key (will be prefixed with 'lock:')
   * @param ttl - Time to live in seconds (default: 30 for bookings)
   * @returns true if lock was acquired, false if already locked
   */
  async acquireLock(key: string, ttl: number = 10): Promise<boolean> {
    const result = await this.redis.set(
      `lock:${key}`,
      'locked',
      'EX',
      ttl,
      'NX',
    );
    return result === 'OK';
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string): Promise<void> {
    await this.redis.del(`lock:${key}`);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Get TTL (time to live) for a key in seconds
   * Returns -1 if key exists but has no expiration
   * Returns -2 if key does not exist
   */
  async getTTL(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  getClient(): Redis {
    return this.redis;
  }
}

