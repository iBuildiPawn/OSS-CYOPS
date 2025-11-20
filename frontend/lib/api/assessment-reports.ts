import { apiClient } from "./client";
import type {
  AssessmentReport,
  AssessmentReportListResponse,
  AssessmentReportStats,
  AssessmentReportVersionsResponse,
  UploadReportRequest,
} from "@/types/assessment-report";

// Assessment Report API
export const assessmentReportApi = {
  // Upload PDF report for an assessment
  upload: async (
    assessmentId: string,
    data: UploadReportRequest,
  ): Promise<{ data: AssessmentReport; message: string }> => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("title", data.title);
    if (data.description) {
      formData.append("description", data.description);
    }

    const response = await apiClient.post<{
      data: AssessmentReport;
      message: string;
    }>(`/assessments/${assessmentId}/reports`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // List reports for an assessment
  list: async (
    assessmentId: string,
    includeAllVersions = false,
  ): Promise<AssessmentReportListResponse> => {
    const response = await apiClient.get<AssessmentReportListResponse>(
      `/assessments/${assessmentId}/reports`,
      {
        params: { include_all_versions: includeAllVersions },
      },
    );
    return response.data;
  },

  // Get report metadata
  get: async (
    assessmentId: string,
    reportId: string,
  ): Promise<{ data: AssessmentReport }> => {
    const response = await apiClient.get<{ data: AssessmentReport }>(
      `/assessments/${assessmentId}/reports/${reportId}`,
    );
    return response.data;
  },

  // Get report file URL for viewing/download
  getFileUrl: (assessmentId: string, reportId: string): string => {
    return `${apiClient.defaults.baseURL}/assessments/${assessmentId}/reports/${reportId}/file`;
  },

  // Download report file
  downloadFile: async (
    assessmentId: string,
    reportId: string,
    filename: string,
  ): Promise<void> => {
    const response = await apiClient.get(
      `/assessments/${assessmentId}/reports/${reportId}/file`,
      {
        responseType: "blob",
      },
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Get version history for a report
  getVersions: async (
    assessmentId: string,
    reportId: string,
  ): Promise<AssessmentReportVersionsResponse> => {
    const response = await apiClient.get<AssessmentReportVersionsResponse>(
      `/assessments/${assessmentId}/reports/${reportId}/versions`,
    );
    return response.data;
  },

  // Delete report (soft delete)
  delete: async (
    assessmentId: string,
    reportId: string,
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/assessments/${assessmentId}/reports/${reportId}`,
    );
    return response.data;
  },

  // Get report statistics
  getStats: async (
    assessmentId: string,
  ): Promise<{ data: AssessmentReportStats }> => {
    const response = await apiClient.get<{
      data: AssessmentReportStats;
    }>(`/assessments/${assessmentId}/reports/stats`);
    return response.data;
  },
};
