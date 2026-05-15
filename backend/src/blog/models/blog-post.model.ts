import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BlogPostModel {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  content: string;

  @Field(() => ID)
  authorId: string;

  @Field()
  authorName: string;

  @Field()
  createdAt: Date;
}
