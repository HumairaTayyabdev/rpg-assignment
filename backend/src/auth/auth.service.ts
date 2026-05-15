import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import { QueryFailedError } from 'typeorm';
import { Repository } from 'typeorm';
import { LogInInput, SignUpInput } from './dto/auth.input';
import { AuthPayload } from './models/auth-payload.model';
import { UserModel } from './models/user.model';
import { TokenService } from '../token/token.service';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly tokenService: TokenService,
  ) {}

  async signUp(input: SignUpInput): Promise<AuthPayload> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new BadRequestException(
        'An account with this email already exists.',
      );
    }

    const user = this.usersRepository.create({
      id: randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: this.hashPassword(input.password),
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      return this.toAuthPayload(savedUser);
    } catch (error) {
      if (error instanceof QueryFailedError && error.driverError) {
        const pgError = error.driverError as { code?: string };
        if (pgError.code === '23505') {
          throw new BadRequestException(
            'An account with this email already exists.',
          );
        }
      }
      throw error;
    }
  }

  async logIn(input: LogInInput): Promise<AuthPayload> {
    const user = await this.usersRepository.findOne({
      where: { email: input.email },
    });

    if (!user || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.toAuthPayload(user);
  }

  async me(authorizationHeader: string | undefined): Promise<UserModel | null> {
    const user =
      await this.findUserFromAuthorizationHeader(authorizationHeader);
    return user ? this.toUserModel(user) : null;
  }

  async requireUserFromAuthorizationHeader(
    authorizationHeader: string | undefined,
  ): Promise<User> {
    const user =
      await this.findUserFromAuthorizationHeader(authorizationHeader);

    if (!user) {
      throw new UnauthorizedException(
        'Invalid or missing authentication token.',
      );
    }

    return user;
  }

  private async findUserFromAuthorizationHeader(
    authorizationHeader: string | undefined,
  ): Promise<User | null> {
    const token = this.tokenService.extractBearerToken(authorizationHeader);

    if (!token) {
      return null;
    }

    const userId = this.tokenService.verifyTokenAndGetUserId(token);

    if (!userId) {
      return null;
    }

    return this.usersRepository.findOne({ where: { id: userId } });
  }

  private toAuthPayload(user: User): AuthPayload {
    return {
      token: this.tokenService.signToken(user),
      user: this.toUserModel(user),
    };
  }

  private toUserModel(user: User): UserModel {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');

    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');

    if (!salt || !hash) {
      return false;
    }

    const hashBuffer = Buffer.from(hash, 'hex');
    const suppliedHashBuffer = scryptSync(password, salt, 64);

    return (
      hashBuffer.length === suppliedHashBuffer.length &&
      timingSafeEqual(hashBuffer, suppliedHashBuffer)
    );
  }
}
