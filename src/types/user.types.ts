/**
 * GET /user/getmyinfo/{parentId}
 * Response: authenticated user info (README §3 User).
 */
export type MyInfo = {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  userCode?: string;
  parentId?: string;
  [key: string]: unknown;
};

/**
 * POST /user/updatemember
 * Body: member fields to update (README §3 User).
 */
export type UpdateMemberBody = Partial<{
  name: string;
  username: string;
  email: string;
  phone: string;
  [key: string]: unknown;
}>;
