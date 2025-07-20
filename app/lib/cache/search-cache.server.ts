// app/lib/cache/search-cache.server.ts
import { createHash } from "crypto";
import { getRedisClient } from "./redis.server";
import { RedisClientType } from "redis";

// NOTE: These interfaces are placeholders. You should import them from their actual source files.
interface Product {
  id: string;
  [key: string]: any;
}

interface SearchResult {
  products: Product[];
  [key: string]: any;
}

export class SearchCache {
  private redisPromise: Promise<RedisClientType | null>;
  private TTL = 3600; // 1 hour

  constructor() {
    this.redisPromise = getRedisClient();
  }

  private async getClient() {
    const client = await this.redisPromise;
    if (!client) {
      // Silently fail if redis is not available
      return null;
    }
    return client;
  }

  async get(
    query: string,
    shopDomain: string,
    filters?: Record<string, any>
  ): Promise<SearchResult | null> {
    const redis = await this.getClient();
    if (!redis) return null;

    const key = this.generateKey(query, shopDomain, filters);
    const cached = await redis.get(key);

    if (cached) {
      await this.trackQuery(query, shopDomain);
      return JSON.parse(cached);
    }

    return null;
  }

  async set(
    query: string, 
    shopDomain: string, 
    results: SearchResult,
    filters?: Record<string, any>
  ) {
    const redis = await this.getClient();
    if (!redis) return;

    const key = this.generateKey(query, shopDomain, filters);
    await redis.setEx(key, this.TTL, JSON.stringify(results));
  }

  async getPopularQueries(shopDomain: string, limit = 10) {
    const redis = await this.getClient();
    if (!redis) return [];

    return redis.zRangeWithScores(`popular:${shopDomain}`, 0, limit - 1, {
      REV: true,
    });
  }

  async trackQuery(query: string, shopDomain: string) {
    const redis = await this.getClient();
    if (!redis) return;
    await redis.zIncrBy(`popular:${shopDomain}`, 1, query);
  }

  async clearCacheForShop(shopDomain: string) {
    const redis = await this.getClient();
    if (!redis) return;
    const pattern = `search:${shopDomain}:*`;
    for await (const key of redis.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      await redis.del(key);
    }
  }

  private generateKey(
    query: string, 
    shopDomain: string,
    filters?: Record<string, any>
  ): string {
    const keyData = {
      query: query.toLowerCase(),
      filters: filters || {}
    };
    
    return `search:${shopDomain}:${createHash("md5")
      .update(JSON.stringify(keyData))
      .digest("hex")}`;
  }
} 