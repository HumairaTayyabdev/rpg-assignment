import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../user.entity';
import { getHttpRequestFromGqlExecutionContext } from '../graphql-request.util';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const req = getHttpRequestFromGqlExecutionContext(context);

    if (!req?.user) {
      throw new Error('CurrentUser used without GqlAuthGuard');
    }

    return req.user;
  },
);
