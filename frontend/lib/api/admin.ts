import { apiClient } from "./client";
import type {
  CreateRoleRequest,
  Role,
  RoleListResponse,
  RoleResponse,
  UpdateRoleRequest,
  UpdateUserStatusRequest,
  User,
  UserListParams,
  UserListResponse,
} from "@/types/api";

// Admin API functions
export const adminApi = {
  // User management
  listUsers: async (params?: UserListParams): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>("/admin/users", {
      params,
    });
    return response.data;
  },

  getUser: async (userId: string): Promise<{ user: User }> => {
    const response = await apiClient.get<{ user: User }>(
      `/admin/users/${userId}`,
    );
    return response.data;
  },

  createUser: async (data: {
    email: string;
    password: string;
    name?: string;
    role_id: string;
    otp_code: string;
  }): Promise<{ message: string; user: User }> => {
    const response = await apiClient.post<{ message: string; user: User }>(
      "/admin/users",
      data,
    );
    return response.data;
  },

  assignRole: async (
    userId: string,
    roleId: string,
  ): Promise<{ message: string; user: User }> => {
    const response = await apiClient.put<{ message: string; user: User }>(
      `/admin/users/${userId}/role`,
      { role_id: roleId },
    );
    return response.data;
  },

  updateUserStatus: async (
    userId: string,
    data: UpdateUserStatusRequest,
  ): Promise<{ message: string; user: User }> => {
    const response = await apiClient.put<{ message: string; user: User }>(
      `/admin/users/${userId}/status`,
      data,
    );
    return response.data;
  },

  deleteUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/admin/users/${userId}`,
    );
    return response.data;
  },

  // Database cleanup operations
  getCleanupStats: async (): Promise<{
    stats: { assets: number; vulnerabilities: number };
  }> => {
    const response = await apiClient.get<{
      stats: { assets: number; vulnerabilities: number };
    }>("/admin/cleanup/stats");
    return response.data;
  },

  cleanupAssets: async (): Promise<{
    message: string;
    deleted_count: number;
  }> => {
    const response = await apiClient.post<{
      message: string;
      deleted_count: number;
    }>("/admin/cleanup/assets");
    return response.data;
  },

  cleanupVulnerabilities: async (): Promise<{
    message: string;
    deleted_count: number;
  }> => {
    const response = await apiClient.post<{
      message: string;
      deleted_count: number;
    }>("/admin/cleanup/vulnerabilities");
    return response.data;
  },

  cleanupAllData: async (): Promise<{
    message: string;
    deleted_count: number;
  }> => {
    const response = await apiClient.post<{
      message: string;
      deleted_count: number;
    }>("/admin/cleanup/all");
    return response.data;
  },
};

// Role API functions
export const roleApi = {
  listRoles: async (): Promise<RoleListResponse> => {
    const response = await apiClient.get<RoleListResponse>("/admin/roles");
    return response.data;
  },

  getRole: async (roleId: string): Promise<{ role: Role }> => {
    const response = await apiClient.get<{ role: Role }>(
      `/admin/roles/${roleId}`,
    );
    return response.data;
  },

  createRole: async (data: CreateRoleRequest): Promise<RoleResponse> => {
    const response = await apiClient.post<RoleResponse>("/admin/roles", data);
    return response.data;
  },

  updateRole: async (
    roleId: string,
    data: UpdateRoleRequest,
  ): Promise<RoleResponse> => {
    const response = await apiClient.put<RoleResponse>(
      `/admin/roles/${roleId}`,
      data,
    );
    return response.data;
  },

  deleteRole: async (roleId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/admin/roles/${roleId}`,
    );
    return response.data;
  },
};
