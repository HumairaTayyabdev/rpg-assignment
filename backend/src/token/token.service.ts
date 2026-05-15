import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export type AccessTokenSubject = {
  id: string;
  email: string;
  name: string;
};

@Injectable()
export class TokenService {
  constructor(private readonly configService: ConfigService) {}

  extractBearerToken(authorizationHeader: string | undefined): string | null {
    if (!authorizationHeader || typeof authorizationHeader !== 'string') {
      return null;
    }

    const trimmed = authorizationHeader.trim();

    if (!trimmed.toLowerCase().startsWith('bearer ')) {
      return null;
    }

    const token = trimmed.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  verifyTokenAndGetUserId(token: string): string | null {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signature] = parts;
    const secret = this.tokenSecret;
    const expectedSignature = createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    try {
      const sigBuf = Buffer.from(signature, 'base64url');
      const expBuf = Buffer.from(expectedSignature, 'base64url');

      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        return null;
      }
    } catch {
      return null;
    }

    let payload: { sub?: string };

    try {
      payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8'),
      ) as {
        sub?: string;
      };
    } catch {
      return null;
    }

    if (!payload.sub || typeof payload.sub !== 'string') {
      return null;
    }

    return payload.sub;
  }

  signToken(subject: AccessTokenSubject): string {
    const header = this.toBase64Url({ alg: 'HS256', typ: 'JWT' });
    const payload = this.toBase64Url({
      sub: subject.id,
      email: subject.email,
      name: subject.name,
      iat: Math.floor(Date.now() / 1000),
    });
    const signature = createHmac('sha256', this.tokenSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  private toBase64Url(value: Record<string, string | number>): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private get tokenSecret(): string {
    const secret = this.configService.get<string>('AUTH_TOKEN_SECRET');

    if (!secret) {
      throw new Error(
        'AUTH_TOKEN_SECRET is not set. Copy backend/.env.example to backend/.env and set AUTH_TOKEN_SECRET.',
      );
    }

    return secret;
  }
}
