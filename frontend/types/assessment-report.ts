export interface AssessmentReport {
  id: string;
  assessment_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  title: string;
  description?: string;
  version: number;
  is_latest: boolean;
  parent_id?: string;
  uploaded_by: string;
  uploaded_by_user?: {
    id: string;
    email: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AssessmentReportListResponse {
  data: AssessmentReport[];
  meta: {
    count: number;
    include_all_versions: boolean;
  };
}

export interface AssessmentReportVersionsResponse {
  data: AssessmentReport[];
  meta: {
    title: string;
    count: number;
  };
}

export interface UploadReportRequest {
  file: File;
  title: string;
  description?: string;
}

export interface AssessmentReportStats {
  total_count: number;
  latest_count: number;
  version_count: number;
  total_size_bytes: number;
  total_size_mb: number;
}
