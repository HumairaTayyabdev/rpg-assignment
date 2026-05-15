import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { PubSubEngine } from 'graphql-subscriptions';
import { DataSource, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { BlogNotificationService } from './blog-notification.service';
import { BLOG_FEED_PAGE_SIZE, BLOG_PUBLISHED_EVENT } from './blog.constants';
import { blogPostToModel } from './blog-post.mapper';
import { BlogPost } from './blog-post.entity';
import { CreatePostInput } from './dto/create-post.input';
import { UpdatePostInput } from './dto/update-post.input';
import { BlogPostModel } from './models/blog-post.model';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly postsRepository: Repository<BlogPost>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly blogNotificationService: BlogNotificationService,
    private readonly pubSub: PubSubEngine,
  ) {}

  async create(author: User, input: CreatePostInput): Promise<BlogPostModel> {
    const model = await this.dataSource.transaction(async (manager) => {
      const postRepo = manager.getRepository(BlogPost);
      const entity = postRepo.create({
        title: input.title,
        content: input.content,
        authorId: author.id,
      });
      const saved = await postRepo.save(entity);

      await this.blogNotificationService.insertNewPostNotificationsForAllUsers(
        manager,
        saved.id,
        author.id,
      );

      return blogPostToModel(saved, author.name);
    });

    await this.pubSub.publish(BLOG_PUBLISHED_EVENT, {
      blogPublished: {
        post: model,
        authorName: author.name,
      },
    });

    return model;
  }

  async update(
    author: User,
    postId: string,
    input: UpdatePostInput,
  ): Promise<BlogPostModel> {
    const existing = await this.findOwnedPostOrThrow(
      author,
      postId,
      ['author'],
      'You cannot edit this post.',
    );

    existing.title = input.title;
    existing.content = input.content;

    const saved = await this.postsRepository.save(existing);

    return blogPostToModel(saved, author.name);
  }

  async deleteIfOwner(author: User, postId: string): Promise<void> {
    const existing = await this.findOwnedPostOrThrow(
      author,
      postId,
      [],
      'You cannot delete this post.',
    );

    await this.postsRepository.remove(existing);
  }

  async findAll(): Promise<BlogPostModel[]> {
    const posts = await this.postsRepository.find({
      relations: ['author'],
      order: { createdAt: 'DESC' },
      take: BLOG_FEED_PAGE_SIZE,
    });

    return posts.map((post) => blogPostToModel(post, post.author.name));
  }

  private async findOwnedPostOrThrow(
    author: User,
    postId: string,
    relations: string[],
    notOwnerMessage: string,
  ): Promise<BlogPost> {
    const existing = await this.postsRepository.findOne({
      where: { id: postId },
      relations,
    });

    if (!existing) {
      throw new NotFoundException('Post not found.');
    }

    if (existing.authorId !== author.id) {
      throw new ForbiddenException(notOwnerMessage);
    }

    return existing;
  }
}
