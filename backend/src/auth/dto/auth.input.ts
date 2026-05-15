import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class SignUpInput {
  @Field()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 80, { message: 'Name must be between 2 and 80 characters.' })
  name: string;

  @Field()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @MaxLength(254, { message: 'Email is too long.' })
  email: string;

  @Field()
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters long.' })
  @MaxLength(128, { message: 'Password must be at most 128 characters long.' })
  @Matches(/[a-zA-Z]/, {
    message: 'Password must include at least one letter.',
  })
  @Matches(/\d/, { message: 'Password must include at least one number.' })
  password: string;
}

@InputType()
export class LogInInput {
  @Field()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @Field()
  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  @MaxLength(128)
  password: string;
}
