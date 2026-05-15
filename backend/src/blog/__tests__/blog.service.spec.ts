import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PubSubEngine } from 'graphql-subscriptions';
import type { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';
import { User } from '../../auth/user.entity';
import { BLOG_FEED_PAGE_SIZE, BLOG_PUBLISHED_EVENT } from '../blog.constants';
import { BlogPost } from '../blog-post.entity';
import { BlogNotificationService } from '../blog-notification.service';
import { BlogService } from '../blog.service';

describe('BlogService', () => {
  let service: BlogService;
  let postsRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    find: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let blogNotificationService: {
    insertNewPostNotificationsForAllUsers: jest.Mock;
  };
  let pubSub: { publish: jest.Mock };

  const author: User = {
    id: 'author-1',
    name: 'Author',
    email: 'a@a.com',
    passwordHash: 'x',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    postsRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(),
    };
    blogNotificationService = {
      insertNewPostNotificationsForAllUsers: jest
        .fn()
        .mockResolvedValue(undefined),
    };
    pubSub = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        { provide: getRepositoryToken(BlogPost), useValue: postsRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: BlogNotificationService, useValue: blogNotificationService },
        { provide: PubSubEngine, useValue: pubSub },
      ],
    }).compile();

    service = module.get(BlogService);
  });

  describe('create', () => {
    it('runs transaction, notifications, then publishes', async () => {
      const savedEntity = {
        id: 'post-1',
        title: 'Hello',
        content: 'Body',
        authorId: author.id,
        createdAt: new Date('2025-01-02'),
      };

      const postRepo = {
        create: jest.fn((dto: Record<string, unknown>) => ({ ...dto })),
        save: jest.fn().mockResolvedValue(savedEntity),
      };

      dataSource.transaction.mockImplementation(
        async (fn: (m: EntityManager) => Promise<unknown>) => {
          const manager = {
            getRepository: jest.fn((entity) => {
              if (entity === BlogPost) {
                return postRepo;
              }
              return {};
            }),
          } as unknown as EntityManager;
          return fn(manager);
        },
      );

      const result = await service.create(author, {
        title: 'Hello',
        content: 'Body',
      });

      expect(result).toMatchObject({
        id: 'post-1',
        title: 'Hello',
        content: 'Body',
        authorId: author.id,
        authorName: author.name,
      });
      expect(
        blogNotificationService.insertNewPostNotificationsForAllUsers,
      ).toHaveBeenCalledWith(expect.anything(), 'post-1', author.id);
      expect(pubSub.publish).toHaveBeenCalledTimes(1);
      expect(pubSub.publish).toHaveBeenCalledWith(
        BLOG_PUBLISHED_EVENT,
        expect.any(Object),
      );
      const publishMock = pubSub.publish;
      const call0 = publishMock.mock.calls[0] as
        | [
            string,
            { blogPublished: { post: { id: string }; authorName: string } },
          ]
        | undefined;
      const publishPayload = call0?.[1];
      expect(publishPayload).toBeDefined();
      expect(publishPayload!.blogPublished.post.id).toBe('post-1');
      expect(publishPayload!.blogPublished.authorName).toBe(author.name);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when post missing', async () => {
      postsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(author, 'missing-id', { title: 'T', content: 'C' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when not owner', async () => {
      postsRepo.findOne.mockResolvedValue({
        id: 'p1',
        title: 'Old',
        content: 'Old',
        authorId: 'someone-else',
        author: { name: 'X' },
        createdAt: new Date(),
      });

      await expect(
        service.update(author, 'p1', { title: 'T', content: 'C' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('saves and returns model when owner', async () => {
      const existing = {
        id: 'p1',
        title: 'Old',
        content: 'Old',
        authorId: author.id,
        author: { name: author.name },
        createdAt: new Date('2025-01-01'),
      };
      postsRepo.findOne.mockResolvedValue(existing);
      postsRepo.save.mockResolvedValue({
        ...existing,
        title: 'New',
        content: 'New body',
      });

      const out = await service.update(author, 'p1', {
        title: 'New',
        content: 'New body',
      });

      expect(out.title).toBe('New');
      expect(out.content).toBe('New body');
      expect(postsRepo.save).toHaveBeenCalled();
    });
  });

  describe('deleteIfOwner', () => {
    it('throws when post missing', async () => {
      postsRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteIfOwner(author, 'x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes when owner', async () => {
      const row = { id: 'p1', authorId: author.id };
      postsRepo.findOne.mockResolvedValue(row);
      await service.deleteIfOwner(author, 'p1');
      expect(postsRepo.remove).toHaveBeenCalledWith(row);
    });
  });

  describe('findAll', () => {
    it('maps posts with author names', async () => {
      postsRepo.find.mockResolvedValue([
        {
          id: 'a',
          title: 'T1',
          content: 'C1',
          authorId: 'u1',
          createdAt: new Date(),
          author: { name: 'U1' },
        },
      ]);

      const list = await service.findAll();

      expect(list).toHaveLength(1);
      expect(list[0].authorName).toBe('U1');
      expect(postsRepo.find).toHaveBeenCalledWith({
        relations: ['author'],
        order: { createdAt: 'DESC' },
        take: BLOG_FEED_PAGE_SIZE,
      });
    });
  });
});
