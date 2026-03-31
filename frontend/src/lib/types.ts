export type UserOut = {
  id: string;
  email: string;
  full_name?: string | null;
  is_active?: boolean;
};

export type LoginResponse = {
  access_token: string;
  token_type?: string;
};

export type TenantOut = {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
};

export type RoleOut = {
  id: string;
  name: string;
  tenant_id?: string | null;
};

export type MembershipOut = {
  id: string;
  user_id: string;
  user_email?: string | null;
  user_full_name?: string | null;
  tenant_id: string;
  role_id: string;
  role_name?: string | null;
  is_active: boolean;
  joined_at: string;
};

export type SwitchContextResponse = {
  access_token: string;
  token_type?: string;
  tenant_id: string;
  role: string;
};

export type PermissionOut = {
  id: string;
  name: string;
  description?: string | null;
};

export type ModuleOut = {
  id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
};

export type AuditLogOut = {
  id: string;
  user_id?: string | null;
  tenant_id?: string | null;
  action: string;
  resource?: string | null;
  details?: string | null;
  created_at: string;
};
