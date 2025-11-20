import { apiClient } from "./client";

import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Report API
export const reportApi = {
  // Get analyst report
  getAnalystReport: async (
    startDate: string,
    endDate: string,
  ): Promise<any> => {
    const response = await apiClient.get(`/reports/analyst`, {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  // Get executive report
  getExecutiveReport: async (
    startDate: string,
    endDate: string,
  ): Promise<any> => {
    const response = await apiClient.get(`/reports/executive`, {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  // Get audit report
  getAuditReport: async (startDate: string, endDate: string): Promise<any> => {
    const response = await apiClient.get(`/reports/audit`, {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  // Get export URL for downloading CSV
  getExportURL: (
    reportType: string,
    startDate: string,
    endDate: string,
  ): string => {
    const token = localStorage.getItem("token");
    return `${API_BASE_URL}/api/v1/reports/${reportType}/export/csv?start_date=${startDate}&end_date=${endDate}&token=${token}`;
  },
};
