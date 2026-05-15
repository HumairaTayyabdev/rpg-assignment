import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import type { User } from './user.entity';

export type AuthGqlContext = {
  req?: Request & { user?: User };
  request?: Request & { user?: User };
};

export function getHttpRequestFromGqlContext(
  ctx: AuthGqlContext,
): (Request & { user?: User }) | undefined {
  return ctx.req ?? ctx.request;
}

export function getHttpRequestFromGqlExecutionContext(
  context: ExecutionContext,
): (Request & { user?: User }) | undefined {
  const gqlContext = GqlExecutionContext.create(context);
  return getHttpRequestFromGqlContext(gqlContext.getContext<AuthGqlContext>());
}
