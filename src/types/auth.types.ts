/**
 * README §1 Authentication
 */

/** GET /authenticate/captcha — Returns captcha payload (e.g. key/image) */
export type CaptchaResponse = {
  key?: string;
  image?: string;
  [key: string]: unknown;
};

/** POST /authenticate/login — Body (README §1) */
export type LoginBody = {
  key: string;
  captcha: string;
  IMEI: string;
  device: string;
  mode: number;
  mobile?: string;
  username: string;
  password: string;
};

/** POST /changepassword — session auth */
export type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
  userId: string;
};

export type ChangePasswordMessage = {
  responseMessageType?: number;
  text?: string;
  numberOfItems?: number;
};

export type ChangePasswordResponse = {
  messages?: (string | ChangePasswordMessage)[];
  success?: boolean;
  data?: boolean;
  wsMessageType?: number;
};

export type AuthenticatedUser = {
  id?: string;
  parentId?: string;
  userCode?: string;
  username?: string;
  userType?: number;
  status?: number;
  bettingLock?: number;
  [key: string]: unknown;
};

export type AuthenticatedCurrency = {
  id?: string;
  name?: string;
  code?: string;
  [key: string]: unknown;
};

export type AuthenticatedParent = {
  id?: string;
  userCode?: string;
  username?: string;
  [key: string]: unknown;
};

/**
 * POST /authenticate/login — normalized response used by the app.
 * When the API returns { success, data: { token, claims, user, ... } }, we also
 * set rawLoginData to data so localStorage can hold the exact same shape.
 */
export type LoginResponse = {
  token?: string;
  primaryToken?: string;
  PrimaryToken?: string;
  Token?: string;
  IMEI?: string;
  userId?: string;
  claims?: string[];
  user?: AuthenticatedUser;
  currency?: AuthenticatedCurrency;
  parent?: AuthenticatedParent;
  ipAddress?: string;
  /** Full `data` object from login envelope — persisted to localStorage as-is */
  rawLoginData?: Record<string, unknown>;
  /** Full API envelope (success, messages, data, wsMessageType) if needed */
  rawLoginEnvelope?: Record<string, unknown>;
  [key: string]: unknown;
};
