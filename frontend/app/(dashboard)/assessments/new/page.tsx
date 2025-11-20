"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewAssessmentPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to assessments page - the modal will be triggered from there
    router.replace("/assessments");
  }, [router]);

  return null;
}
