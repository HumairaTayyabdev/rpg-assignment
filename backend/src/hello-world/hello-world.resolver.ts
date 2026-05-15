import { Query, Resolver } from '@nestjs/graphql';
import { HelloWorldService } from './hello-world.service';
import { HelloWorldModel } from './model/HelloWorld.model';

@Resolver()
export class HelloWorldResolver {
  constructor(private helloWorldService: HelloWorldService) {}

  @Query(() => HelloWorldModel)
  sayHello(): HelloWorldModel {
    return this.helloWorldService.sayHello();
  }
}
