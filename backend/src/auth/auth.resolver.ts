import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LogInInput, SignUpInput } from './dto/auth.input';
import {
  getHttpRequestFromGqlContext,
  type AuthGqlContext,
} from './graphql-request.util';
import { AuthPayload } from './models/auth-payload.model';
import { UserModel } from './models/user.model';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Query(() => UserModel, { nullable: true })
  async me(@Context() context: unknown): Promise<UserModel | null> {
    const req = getHttpRequestFromGqlContext(context as AuthGqlContext);
    const raw = req?.headers?.authorization as string | string[] | undefined;
    const authorization: string | undefined = Array.isArray(raw) ? raw[0] : raw;

    return this.authService.me(authorization);
  }

  @Mutation(() => AuthPayload)
  async signUp(@Args('input') input: SignUpInput): Promise<AuthPayload> {
    return this.authService.signUp(input);
  }

  @Mutation(() => AuthPayload)
  async logIn(@Args('input') input: LogInInput): Promise<AuthPayload> {
    return this.authService.logIn(input);
  }
}
