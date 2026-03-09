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
  mobile: string;
  username: string;
  password: string;
};

/** POST /authenticate/login — Response: token/session data */
export type LoginResponse = {
  token?: string;
  primaryToken?: string;
  PrimaryToken?: string;
  Token?: string;
  IMEI?: string;
  [key: string]: unknown;
};
