import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PubSubEngine } from 'graphql-subscriptions';
import { AuthModule } from '../auth/auth.module';
import { BlogPost } from './blog-post.entity';
import { BlogNotification } from './blog-notification.entity';
import { BlogNotificationService } from './blog-notification.service';
import { createBlogPubSub } from './blog-pubsub.factory';
import { BlogResolver } from './blog.resolver';
import { BlogService } from './blog.service';

@Module({
  imports: [TypeOrmModule.forFeature([BlogPost, BlogNotification]), AuthModule],
  providers: [
    BlogResolver,
    BlogService,
    BlogNotificationService,
    {
      provide: PubSubEngine,
      useFactory: createBlogPubSub,
      inject: [ConfigService],
    },
  ],
})
export class BlogModule implements OnModuleDestroy {
  constructor(
    @Inject(PubSubEngine) private readonly pubSubEngine: PubSubEngine,
  ) {}

  async onModuleDestroy(): Promise<void> {
    const maybeClose = this.pubSubEngine as { close?: () => Promise<unknown> };
    await maybeClose.close?.();
  }
}
