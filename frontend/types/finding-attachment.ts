export type AttachmentType = "PROOF" | "REMEDIATION" | "VERIFICATION" | "OTHER";

export interface FindingAttachment {
  id: string;
  finding_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  is_image: boolean;
  width?: number;
  height?: number;
  normalized: boolean;
  thumbnail_path?: string;
  attachment_type: AttachmentType;
  description?: string;
  uploaded_by: string;
  uploaded_by_user?: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AttachmentStats {
  total_count: number;
  total_size_bytes: number;
  total_size_mb: number;
  image_count: number;
  proof_count: number;
  verification_count: number;
}

export interface UploadAttachmentRequest {
  file: File;
  attachment_type: AttachmentType;
  description?: string;
}

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  PROOF: "Proof of Fix",
  REMEDIATION: "Remediation Evidence",
  VERIFICATION: "Verification Result",
  OTHER: "Other",
};

export const ATTACHMENT_TYPE_DESCRIPTIONS: Record<AttachmentType, string> = {
  PROOF: "Screenshots or files proving the vulnerability has been fixed",
  REMEDIATION: "Evidence showing the fix has been applied",
  VERIFICATION: "Results from testing after remediation",
  OTHER: "Supporting documentation",
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
export const MAX_FILE_SIZE_MB = 10;

export const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ACCEPTED_FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".pdf",
  ".txt",
  ".doc",
  ".docx",
];

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function getAttachmentFileUrl(
  attachmentId: string,
  thumbnail: boolean = false,
): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const thumbnailParam = thumbnail ? "?thumbnail=true" : "";
  return `${baseUrl}/api/v1/vulnerabilities/attachments/${attachmentId}/file${thumbnailParam}`;
}

export function getAttachmentDownloadUrl(attachmentId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  return `${baseUrl}/api/v1/vulnerabilities/attachments/${attachmentId}/download`;
}
