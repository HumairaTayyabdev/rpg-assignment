import { Field, ObjectType } from '@nestjs/graphql';
import { BlogPostModel } from './blog-post.model';
import { PageInfo } from './page-info.model';

@ObjectType()
export class BlogPostConnection {
  @Field(() => [BlogPostModel])
  nodes: BlogPostModel[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
