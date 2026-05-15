import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreatePostInput {
  @Field()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Title is required.' })
  @MaxLength(200, { message: 'Title must be at most 200 characters.' })
  title: string;

  @Field()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Content is required.' })
  @MaxLength(50000, { message: 'Content must be at most 50000 characters.' })
  content: string;
}
