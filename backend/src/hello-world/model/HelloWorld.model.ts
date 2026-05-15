import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HelloWorldModel {
  value: string;
}
