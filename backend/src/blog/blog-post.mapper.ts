import type { BlogPost } from './blog-post.entity';
import type { BlogPostModel } from './models/blog-post.model';

export function blogPostToModel(
  post: BlogPost,
  authorName: string,
): BlogPostModel {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    authorId: post.authorId,
    authorName,
    createdAt: post.createdAt,
  };
}
