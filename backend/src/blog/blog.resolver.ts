import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSubEngine } from 'graphql-subscriptions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { User } from '../auth/user.entity';
import { BLOG_PUBLISHED_EVENT } from './blog.constants';
import { BlogNotificationService } from './blog-notification.service';
import { BlogService } from './blog.service';
import { CreatePostInput } from './dto/create-post.input';
import { UpdatePostInput } from './dto/update-post.input';
import { BlogPublishedPayload } from './models/blog-published.payload';
import { BlogPostModel } from './models/blog-post.model';
import { BlogNotificationModel } from './models/blog-notification.model';

@Resolver()
export class BlogResolver {
  constructor(
    private readonly blogService: BlogService,
    private readonly blogNotificationService: BlogNotificationService,
    private readonly pubSub: PubSubEngine,
  ) {}

  @Subscription(() => BlogPublishedPayload)
  @UseGuards(GqlAuthGuard)
  blogPublished() {
    return this.pubSub.asyncIterableIterator(BLOG_PUBLISHED_EVENT);
  }

  @Query(() => [BlogPostModel])
  @UseGuards(GqlAuthGuard)
  async allBlogPosts(): Promise<BlogPostModel[]> {
    return this.blogService.findAll();
  }

  @Query(() => [BlogNotificationModel])
  @UseGuards(GqlAuthGuard)
  async myNotifications(
    @CurrentUser() user: User,
  ): Promise<BlogNotificationModel[]> {
    return this.blogNotificationService.findForRecipient(user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async markAllNotificationsRead(@CurrentUser() user: User): Promise<boolean> {
    await this.blogNotificationService.markAllReadForRecipient(user.id);
    return true;
  }

  @Mutation(() => BlogPostModel)
  @UseGuards(GqlAuthGuard)
  async createPost(
    @CurrentUser() user: User,
    @Args('input') input: CreatePostInput,
  ): Promise<BlogPostModel> {
    return this.blogService.create(user, input);
  }

  @Mutation(() => BlogPostModel)
  @UseGuards(GqlAuthGuard)
  async updatePost(
    @CurrentUser() user: User,
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdatePostInput,
  ): Promise<BlogPostModel> {
    return this.blogService.update(user, id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deletePost(
    @CurrentUser() user: User,
    @Args('id', { type: () => String }) id: string,
  ): Promise<boolean> {
    await this.blogService.deleteIfOwner(user, id);
    return true;
  }
}
