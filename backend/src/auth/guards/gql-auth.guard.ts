import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { getHttpRequestFromGqlExecutionContext } from '../graphql-request.util';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = getHttpRequestFromGqlExecutionContext(context);

    if (!req?.headers) {
      throw new UnauthorizedException('Missing request context.');
    }

    const raw = req.headers.authorization as string | string[] | undefined;
    const authorization: string | undefined = Array.isArray(raw) ? raw[0] : raw;

    const user =
      await this.authService.requireUserFromAuthorizationHeader(authorization);

    req.user = user;
    return true;
  }
}
