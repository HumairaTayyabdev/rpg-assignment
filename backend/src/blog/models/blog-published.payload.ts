import { Field, ObjectType } from '@nestjs/graphql';
import { BlogPostModel } from './blog-post.model';

@ObjectType()
export class BlogPublishedPayload {
  @Field(() => BlogPostModel)
  post: BlogPostModel;

  @Field()
  authorName: string;
}
