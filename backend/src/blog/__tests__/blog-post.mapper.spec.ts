import type { BlogPost } from '../blog-post.entity';
import { blogPostToModel } from '../blog-post.mapper';

describe('blogPostToModel', () => {
  it('maps entity fields and author display name', () => {
    const post = {
      id: 'id-1',
      title: 'Title',
      content: 'Content',
      authorId: 'auth-1',
      createdAt: new Date('2025-03-15'),
    } as BlogPost;

    expect(blogPostToModel(post, 'Jamie')).toEqual({
      id: 'id-1',
      title: 'Title',
      content: 'Content',
      authorId: 'auth-1',
      authorName: 'Jamie',
      createdAt: post.createdAt,
    });
  });
});
