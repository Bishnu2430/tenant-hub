// Shared types for the multi-tenant SaaS platform

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  language?: string;
  created_at?: string;
}

export interface TenantMember {
  id: string;
  user_id: string;
  tenant_id: string;
  role_id: string;
  role_name?: string;
  user_email?: string;
  user_full_name?: string;
  status?: string;
  joined_at?: string;
}

export interface Role {
  id: string;
  name: string;
  tenant_id: string;
  description?: string;
  is_system?: boolean;
  created_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface Module {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface TenantModule {
  id: string;
  tenant_id: string;
  module_id: string;
  module_name?: string;
  enabled_at?: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan?: string;
  status?: string;
  starts_at?: string;
  ends_at?: string;
}

export interface Feature {
  id: string;
  tenant_id: string;
  name: string;
  enabled: boolean;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface SwitchContextResponse {
  access_token: string;
  tenant_id: string;
  role: string;
  token_type: string;
}

export interface ApiError {
  detail?: string;
  message?: string;
}
