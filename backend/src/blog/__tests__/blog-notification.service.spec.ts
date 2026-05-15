import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { EntityManager } from 'typeorm';
import { User } from '../../auth/user.entity';
import { BLOG_NOTIFICATION_PAGE_SIZE } from '../blog.constants';
import { BlogNotification } from '../blog-notification.entity';
import { BlogNotificationService } from '../blog-notification.service';

describe('BlogNotificationService', () => {
  let service: BlogNotificationService;
  let notificationsRepo: { find: jest.Mock; update: jest.Mock };
  let insertMock: jest.Mock;

  beforeEach(async () => {
    insertMock = jest.fn().mockResolvedValue(undefined);
    notificationsRepo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogNotificationService,
        {
          provide: getRepositoryToken(BlogNotification),
          useValue: notificationsRepo,
        },
      ],
    }).compile();

    service = module.get(BlogNotificationService);
  });

  it('insertNewPostNotificationsForAllUsers inserts one row per user', async () => {
    const userRepo = {
      find: jest.fn().mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]),
    };
    const notifRepo = { insert: insertMock };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) {
          return userRepo;
        }
        if (entity === BlogNotification) {
          return notifRepo;
        }
        return {};
      }),
    } as unknown as EntityManager;

    await service.insertNewPostNotificationsForAllUsers(
      manager,
      'post-99',
      'u1',
    );

    expect(insertMock).toHaveBeenCalledTimes(1);
    const firstCall = insertMock.mock.calls[0] as
      | [{ recipientId: string; blogPostId: string; read: boolean }[]]
      | undefined;
    expect(firstCall).toBeDefined();
    const rows = firstCall![0];
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.recipientId === 'u1')?.read).toBe(true);
    expect(rows.find((r) => r.recipientId === 'u2')?.read).toBe(false);
    expect(rows.every((r) => r.blogPostId === 'post-99')).toBe(true);
  });

  it('skips insert when no users', async () => {
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) {
          return { find: jest.fn().mockResolvedValue([]) };
        }
        if (entity === BlogNotification) {
          return { insert: insertMock };
        }
        return {};
      }),
    } as unknown as EntityManager;

    await service.insertNewPostNotificationsForAllUsers(manager, 'p1', 'u1');

    expect(insertMock).not.toHaveBeenCalled();
  });

  it('findForRecipient maps notifications', async () => {
    notificationsRepo.find.mockResolvedValue([
      {
        id: 'n1',
        read: false,
        createdAt: new Date('2025-01-01'),
        blogPost: {
          id: 'p1',
          title: 'T',
          content: 'C',
          authorId: 'a1',
          createdAt: new Date(),
          author: { name: 'Writer' },
        },
      },
    ]);

    const list = await service.findForRecipient('me');

    expect(list[0].post.title).toBe('T');
    expect(list[0].post.authorName).toBe('Writer');
    expect(notificationsRepo.find).toHaveBeenCalledWith({
      where: { recipientId: 'me' },
      relations: ['blogPost', 'blogPost.author'],
      order: { createdAt: 'DESC' },
      take: BLOG_NOTIFICATION_PAGE_SIZE,
    });
  });
});
