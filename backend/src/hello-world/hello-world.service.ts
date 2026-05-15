import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloWorldService {
  sayHello() {
    return {
      value: 'Hello World!',
    };
  }
}
