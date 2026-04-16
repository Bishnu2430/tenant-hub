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

export interface ERPRecord {
  id: string;
  tenant_id: string;
  module_name: string;
  entity_name: string;
  title: string;
  status: string;
  priority: string;
  assigned_to_user_id?: string | null;
  linked_record_id?: string | null;
  linked_record_title?: string | null;
  amount_cents?: number | null;
  owner_user_id?: string | null;
  due_at?: string | null;
  blocked_at?: string | null;
  blocked_reason?: string | null;
  payload_json?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ERPModuleSummary {
  module_name: string;
  total_records: number;
  open_records: number;
  done_records: number;
  blocked_records: number;
  overdue_records: number;
  total_amount_cents: number;
  entities: string[];
}

export interface ERPDashboardSummary {
  tenant_id: string;
  total_records: number;
  open_records: number;
  done_records: number;
  blocked_records: number;
  overdue_records: number;
  total_amount_cents: number;
  modules: ERPModuleSummary[];
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
