/**
 * HTTP API client for CYOPS backend
 */

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { API_BASE_URL, API_KEY, DEFAULT_TIMEOUT } from "../constants.js";

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(API_KEY ? { "Authorization": `Bearer ${API_KEY}` } : {})
      }
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Log request for debugging (to stderr for MCP stdio transport)
        console.error(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // Log error for debugging
        console.error(`[API Error] ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const response = await this.client.get<T>(endpoint, { params });
    return response.data;
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(endpoint, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(endpoint, data);
    return response.data;
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(endpoint, data);
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.client.delete<T>(endpoint);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new APIClient();
