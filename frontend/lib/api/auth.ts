import { apiClient, setAuthToken, removeAuthToken } from "./client";
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  Disable2FARequest,
  Disable2FAResponse,
  Enable2FAResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  Session,
  UpdateProfileRequest,
  UpdateProfileResponse,
  User,
  Verify2FARequest,
  Verify2FAResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from "@/types/api";

// Auth API functions
export const authApi = {
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>(
      "/auth/register",
      data,
    );
    return response.data;
  },

  verifyEmail: async (
    data: VerifyEmailRequest,
  ): Promise<VerifyEmailResponse> => {
    const response = await apiClient.post<VerifyEmailResponse>(
      "/auth/verify-email",
      data,
    );
    return response.data;
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/auth/login", data);
    // Store token on successful login
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
    // Remove token on logout
    removeAuthToken();
  },

  forgotPassword: async (
    data: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse> => {
    const response = await apiClient.post<ForgotPasswordResponse>(
      "/auth/forgot-password",
      data,
    );
    return response.data;
  },

  resetPassword: async (
    data: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<ResetPasswordResponse>(
      "/auth/reset-password",
      data,
    );
    return response.data;
  },
};

// Profile API functions
export const profileApi = {
  getProfile: async (): Promise<{ user: User }> => {
    const response = await apiClient.get<{ user: User }>("/profile");
    return response.data;
  },

  updateProfile: async (
    data: UpdateProfileRequest,
  ): Promise<UpdateProfileResponse> => {
    const response = await apiClient.put<UpdateProfileResponse>(
      "/profile",
      data,
    );
    return response.data;
  },

  changePassword: async (
    data: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse> => {
    const response = await apiClient.post<ChangePasswordResponse>(
      "/profile/change-password",
      data,
    );
    return response.data;
  },

  getActiveSessions: async (): Promise<{ sessions: Session[] }> => {
    const response = await apiClient.get<{ sessions: Session[] }>(
      "/profile/sessions",
    );
    return response.data;
  },

  revokeSession: async (sessionId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/profile/sessions/${sessionId}`,
    );
    return response.data;
  },

  revokeAllSessions: async (): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      "/profile/sessions",
    );
    return response.data;
  },
};

// Two-factor authentication API functions
export const twoFactorApi = {
  enable: async (issuer: string = "Auth App"): Promise<Enable2FAResponse> => {
    const response = await apiClient.post<Enable2FAResponse>(
      "/auth/2fa/enable",
      { issuer },
    );
    return response.data;
  },

  verify: async (data: Verify2FARequest): Promise<Verify2FAResponse> => {
    const response = await apiClient.post<Verify2FAResponse>(
      "/auth/2fa/verify",
      data,
    );
    return response.data;
  },

  disable: async (data: Disable2FARequest): Promise<Disable2FAResponse> => {
    const response = await apiClient.post<Disable2FAResponse>(
      "/auth/2fa/disable",
      data,
    );
    return response.data;
  },
};
