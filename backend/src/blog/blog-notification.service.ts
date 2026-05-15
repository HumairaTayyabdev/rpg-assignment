import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { BLOG_NOTIFICATION_PAGE_SIZE } from './blog.constants';
import { blogPostToModel } from './blog-post.mapper';
import { BlogNotification } from './blog-notification.entity';
import { BlogNotificationModel } from './models/blog-notification.model';

@Injectable()
export class BlogNotificationService {
  constructor(
    @InjectRepository(BlogNotification)
    private readonly notificationsRepository: Repository<BlogNotification>,
  ) {}

  async insertNewPostNotificationsForAllUsers(
    manager: EntityManager,
    postId: string,
    authorId: string,
  ): Promise<void> {
    const userRepo = manager.getRepository(User);
    const notifRepo = manager.getRepository(BlogNotification);
    const users = await userRepo.find({ select: ['id'] });

    const rows = users.map((u) => ({
      id: randomUUID(),
      recipientId: u.id,
      blogPostId: postId,
      read: u.id === authorId,
    }));

    if (rows.length === 0) {
      return;
    }

    await notifRepo.insert(rows);
  }

  async findForRecipient(userId: string): Promise<BlogNotificationModel[]> {
    const list = await this.notificationsRepository.find({
      where: { recipientId: userId },
      relations: ['blogPost', 'blogPost.author'],
      order: { createdAt: 'DESC' },
      take: BLOG_NOTIFICATION_PAGE_SIZE,
    });

    return list.map((n) => this.toModel(n));
  }

  async markAllReadForRecipient(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { recipientId: userId, read: false },
      { read: true },
    );
  }

  private toModel(entity: BlogNotification): BlogNotificationModel {
    const post = entity.blogPost;
    const authorName = post.author?.name ?? 'Unknown';

    return {
      id: entity.id,
      read: entity.read,
      createdAt: entity.createdAt,
      post: blogPostToModel(post, authorName),
    };
  }
}
