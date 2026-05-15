import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scryptSync } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { TokenService } from '../../token/token.service';
import { AuthService } from '../auth.service';
import { User } from '../user.entity';

function hashPasswordLikeAuth(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let tokenService: {
    extractBearerToken: jest.Mock;
    verifyTokenAndGetUserId: jest.Mock;
    signToken: jest.Mock;
  };

  const savedUser: User = {
    id: 'usr-1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'salt:hash',
    createdAt: new Date('2024-06-01'),
  };

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto: Partial<User>) => ({ ...dto })),
      save: jest.fn(),
    };
    tokenService = {
      extractBearerToken: jest.fn(),
      verifyTokenAndGetUserId: jest.fn(),
      signToken: jest.fn().mockReturnValue('jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('signUp', () => {
    it('throws when email already exists', async () => {
      usersRepo.findOne.mockResolvedValue(savedUser);

      await expect(
        service.signUp({
          name: 'Other',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('returns token and user on success', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      usersRepo.save.mockResolvedValue(savedUser);

      const result = await service.signUp({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(tokenService.signToken).toHaveBeenCalledWith(
        expect.objectContaining({
          id: savedUser.id,
          email: savedUser.email,
          name: savedUser.name,
        }),
      );
      expect(result.token).toBe('jwt-token');
      expect(result.user).toEqual({
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
      });
    });

    it('maps unique violation to BadRequestException', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      const driverErr = Object.assign(new Error('duplicate'), {
        code: '23505',
      });
      const err = new QueryFailedError('INSERT', [], driverErr);
      usersRepo.save.mockRejectedValue(err);

      await expect(
        service.signUp({
          name: 'Test User',
          email: 'new@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('logIn', () => {
    it('returns auth payload when credentials valid', async () => {
      const password = 'correctHorse1';
      usersRepo.findOne.mockResolvedValue({
        ...savedUser,
        email: 'login@example.com',
        passwordHash: hashPasswordLikeAuth(password),
      });

      const out = await service.logIn({ email: 'login@example.com', password });

      expect(out.token).toBe('jwt-token');
      expect(out.user.email).toBe('login@example.com');
    });

    it('throws when user missing', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.logIn({
          email: 'missing@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when password wrong', async () => {
      usersRepo.findOne.mockResolvedValue({
        ...savedUser,
        passwordHash: hashPasswordLikeAuth('actualSecret'),
      });

      await expect(
        service.logIn({ email: 'test@example.com', password: 'wrongGuess' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('me / requireUserFromAuthorizationHeader', () => {
    it('me returns null when no bearer token', async () => {
      tokenService.extractBearerToken.mockReturnValue(null);

      await expect(service.me(undefined)).resolves.toBeNull();
      expect(usersRepo.findOne).not.toHaveBeenCalled();
    });

    it('me returns user model when token valid', async () => {
      tokenService.extractBearerToken.mockReturnValue('tok');
      tokenService.verifyTokenAndGetUserId.mockReturnValue(savedUser.id);
      usersRepo.findOne.mockResolvedValue(savedUser);

      const result = await service.me('Bearer tok');
      expect(result).toEqual({
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
      });
    });

    it('requireUser throws when unauthenticated', async () => {
      tokenService.extractBearerToken.mockReturnValue(null);

      await expect(
        service.requireUserFromAuthorizationHeader(undefined),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
