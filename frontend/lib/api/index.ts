// Export API client and utilities
export {
  apiClient,
  setAuthToken,
  getAuthToken,
  removeAuthToken,
  handleApiError,
  type ApiResponse,
  type ApiError,
} from "./client";

// Export all API modules
export { authApi, profileApi, twoFactorApi } from "./auth";
export { adminApi, roleApi } from "./admin";
export { apiKeyApi } from "./api-keys";
export { settingsApi } from "./settings";
export { vulnerabilityApi } from "./vulnerabilities";
export { assetApi } from "./assets";
export { vulnerabilityFindingApi } from "./findings";
export { affectedSystemApi } from "./affected-systems";
export {
  integrationConfigApi,
  nessusIntegrationApi,
  type NessusScan,
  type NessusScanDetail,
  type NessusScanPreview,
  type ImportScanRequest,
  type ImportMultipleScansRequest,
  type ImportAllScansRequest,
  type ImportResult,
  type ImportMultipleResult,
  type ImportAllResult,
} from "./integrations";
export { assessmentApi } from "./assessments";
export { assessmentReportApi } from "./assessment-reports";
export { reportApi } from "./reports";

// Re-export default client for backwards compatibility
export { default } from "./client";
