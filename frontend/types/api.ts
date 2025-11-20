// Role types
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  level: number;
  is_default: boolean;
  is_system: boolean;
  permissions?: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  role_id?: string;
  role?: Role;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

// Session types
export interface Session {
  id: string;
  user_id: string;
  token?: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  last_used_at?: string;
  revoked_at?: string;
  created_at: string;
}

// Auth request/response types
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
  two_factor_code?: string;
}

export interface LoginResponse {
  message: string;
  user?: User;
  token?: string;
  requires_two_factor?: boolean;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
  user: User;
}

// Password reset types
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

// Profile types
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface UpdateProfileResponse {
  message: string;
  user: User;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

// Two-factor authentication types
export interface Enable2FARequest {
  issuer: string;
}

export interface Enable2FAResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
  url: string;
}

export interface Verify2FARequest {
  code: string;
}

export interface Verify2FAResponse {
  message: string;
}

export interface Disable2FARequest {
  password: string;
  code: string;
}

export interface Disable2FAResponse {
  message: string;
}

// Role and permissions types
export interface AssignRoleRequest {
  user_id?: string;
  role_id: string;
}

export interface AssignRoleResponse {
  message: string;
  user: User;
}

// Role management types
export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  level: number;
  permissions: Record<string, string[]>;
}

export interface UpdateRoleRequest {
  display_name: string;
  description?: string;
  level: number;
  permissions: Record<string, string[]>;
}

export interface RoleResponse {
  message?: string;
  role: Role;
}

export interface RoleListResponse {
  roles: Role[];
}

// Admin types
export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface UserListParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
}

export interface UpdateUserStatusRequest {
  email_verified?: boolean;
}

// Common types
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  status: number;
  request_id?: string;
  details?: Record<string, unknown>;
  validation_errors?: ValidationError[];
}
