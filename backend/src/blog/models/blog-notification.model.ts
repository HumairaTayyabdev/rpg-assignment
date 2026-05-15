import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BlogPostModel } from './blog-post.model';

@ObjectType()
export class BlogNotificationModel {
  @Field(() => ID)
  id: string;

  @Field()
  read: boolean;

  @Field()
  createdAt: Date;

  @Field(() => BlogPostModel)
  post: BlogPostModel;
}
