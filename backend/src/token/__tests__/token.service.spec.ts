import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../token.service';

describe('TokenService', () => {
  let service: TokenService;

  const mockConfig = (secret: string | undefined) => {
    return {
      get: jest.fn((key: string) =>
        key === 'AUTH_TOKEN_SECRET' ? secret : undefined,
      ),
    } as unknown as ConfigService;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: ConfigService,
          useValue: mockConfig(process.env.AUTH_TOKEN_SECRET),
        },
      ],
    }).compile();

    service = module.get(TokenService);
  });

  describe('extractBearerToken', () => {
    it('returns null for undefined', () => {
      expect(service.extractBearerToken(undefined)).toBeNull();
    });

    it('returns null when not Bearer', () => {
      expect(service.extractBearerToken('Basic xyz')).toBeNull();
    });

    it('returns token for Bearer header', () => {
      expect(service.extractBearerToken('Bearer abc.def.ghi')).toBe(
        'abc.def.ghi',
      );
    });

    it('trims token', () => {
      expect(service.extractBearerToken('Bearer   tok  ')).toBe('tok');
    });
  });

  describe('signToken / verifyTokenAndGetUserId', () => {
    it('round-trips subject id', () => {
      const token = service.signToken({
        id: 'user-uuid-1',
        email: 'a@b.com',
        name: 'Ada',
      });
      expect(service.verifyTokenAndGetUserId(token)).toBe('user-uuid-1');
    });

    it('returns null for tampered signature', () => {
      const token = service.signToken({
        id: 'u1',
        email: 'e@e.com',
        name: 'N',
      });
      const parts = token.split('.');
      parts[2] = 'bad';
      expect(service.verifyTokenAndGetUserId(parts.join('.'))).toBeNull();
    });

    it('returns null for malformed token', () => {
      expect(service.verifyTokenAndGetUserId('not.three.parts')).toBeNull();
    });
  });

  it('throws when AUTH_TOKEN_SECRET is missing', async () => {
    const module = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: ConfigService, useValue: mockConfig(undefined) },
      ],
    }).compile();

    const bare = module.get(TokenService);
    expect(() =>
      bare.signToken({ id: '1', email: 'e@e.com', name: 'x' }),
    ).toThrow(/AUTH_TOKEN_SECRET/);
  });
});
