export type RegisterInput = {
  email: string;
  username: string;
  displayName?: string | undefined;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
};

export type AuthResult = {
  user: AuthUser;
  accessToken: string;
};

export type RequestUser = {
  id: string;
};
