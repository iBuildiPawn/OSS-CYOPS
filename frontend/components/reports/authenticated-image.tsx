"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthenticatedImageProps {
  findingId: string;
  attachmentId: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export function AuthenticatedImage({
  findingId,
  attachmentId,
  alt = "Attachment",
  className = "",
  onClick,
}: AuthenticatedImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await apiClient.get(
          `/vulnerabilities/attachments/${attachmentId}/file`,
          { responseType: "blob" }
        );

        // Only update state if component is still mounted
        if (isMounted) {
          // Create blob URL
          objectUrl = URL.createObjectURL(response.data);
          setImageUrl(objectUrl);
        }
      } catch (err: any) {
        // Silently handle 404 errors (attachment doesn't exist)
        if (err?.statusCode !== 404) {
          console.error("Failed to fetch image:", err);
        }
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchImage();

    // Cleanup: revoke blob URL and mark component as unmounted
    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [findingId, attachmentId]);

  if (loading) {
    return <Skeleton className={className} />;
  }

  if (error || !imageUrl) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-muted text-muted-foreground text-xs p-4`}
      >
        <div className="text-center">
          <div className="text-lg mb-1">📷</div>
          <div>Image not found</div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onClick={onClick}
    />
  );
}
