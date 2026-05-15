import { ConfigService } from '@nestjs/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PubSub, PubSubEngine } from 'graphql-subscriptions';
import type { RedisOptions } from 'ioredis';
import Redis from 'ioredis';

export function createBlogPubSub(configService: ConfigService): PubSubEngine {
  const disabled = (
    configService.get<string>('REDIS_DISABLED') ?? ''
  ).toLowerCase();
  if (disabled === 'true' || disabled === '1') {
    return new PubSub();
  }

  const host = configService.get<string>('REDIS_HOST', 'localhost');
  const port = Number(configService.get<string>('REDIS_PORT') ?? '6379');
  const password = configService.get<string>('REDIS_PASSWORD') || undefined;

  const connection: RedisOptions = {
    host,
    port,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  if (password) {
    connection.password = password;
  }

  return new RedisPubSub({
    publisher: new Redis(connection),
    subscriber: new Redis(connection),
  });
}
