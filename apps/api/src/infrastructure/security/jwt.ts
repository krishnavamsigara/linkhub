import {
  SignJWT,
  jwtVerify
} from 'jose';

import { env } from '../../config/index.js';

const accessSecret = new TextEncoder().encode(
  env.JWT_ACCESS_SECRET,
);

const refreshSecret = new TextEncoder().encode(
  env.JWT_REFRESH_SECRET,
);

export type AccessTokenPayload = {
  sub: string;
  type: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  sid: string;
  type: 'refresh';
};

export async function signAccessToken(
  userId: string,
): Promise<string> {
  return new SignJWT({
    type: 'access',
  })
    .setProtectedHeader({
      alg: 'HS256',
    })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(accessSecret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(
    token,
    accessSecret,
    {
      algorithms: ['HS256'],
    },
  );

  if (
    payload.type !== 'access' ||
    typeof payload.sub !== 'string'
  ) {
    throw new Error('Invalid access token');
  }

  return {
    sub: payload.sub,
    type: 'access',
  };
}

export async function signRefreshToken(
  userId: string,
  sessionId: string,
): Promise<string> {
  return new SignJWT({
    type: 'refresh',
  })
    .setProtectedHeader({
      alg: 'HS256',
    })
    .setSubject(userId)
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(refreshSecret);
}

export async function verifyRefreshToken(
  token: string,
): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(
    token,
    refreshSecret,
    {
      algorithms: ['HS256'],
    },
  );

  if (
    payload.type !== 'refresh' ||
    typeof payload.sub !== 'string' ||
    typeof payload.jti !== 'string'
  ) {
    throw new Error('Invalid refresh token');
  }

  return {
    sub: payload.sub,
    sid: payload.jti,
    type: 'refresh',
  };
}
