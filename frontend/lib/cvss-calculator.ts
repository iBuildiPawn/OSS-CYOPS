/**
 * CVSS v3.1 Calculator
 * Based on CVSS v3.1 Specification: https://www.first.org/cvss/v3.1/specification-document
 */

export type CVSSMetric =
  | "AV" // Attack Vector
  | "AC" // Attack Complexity
  | "PR" // Privileges Required
  | "UI" // User Interaction
  | "S" // Scope
  | "C" // Confidentiality
  | "I" // Integrity
  | "A"; // Availability

export interface CVSSMetrics {
  AV: "N" | "A" | "L" | "P"; // Network, Adjacent, Local, Physical
  AC: "L" | "H"; // Low, High
  PR: "N" | "L" | "H"; // None, Low, High
  UI: "N" | "R"; // None, Required
  S: "U" | "C"; // Unchanged, Changed
  C: "N" | "L" | "H"; // None, Low, High
  I: "N" | "L" | "H"; // None, Low, High
  A: "N" | "L" | "H"; // None, Low, High
}

export const CVSS_OPTIONS = {
  AV: [
    { value: "N", label: "Network (N)", description: "Exploitable remotely" },
    {
      value: "A",
      label: "Adjacent (A)",
      description: "Requires local network access",
    },
    { value: "L", label: "Local (L)", description: "Requires local access" },
    {
      value: "P",
      label: "Physical (P)",
      description: "Requires physical access",
    },
  ],
  AC: [
    {
      value: "L",
      label: "Low (L)",
      description: "No special conditions required",
    },
    {
      value: "H",
      label: "High (H)",
      description: "Special conditions required",
    },
  ],
  PR: [
    { value: "N", label: "None (N)", description: "No privileges required" },
    { value: "L", label: "Low (L)", description: "Basic user privileges" },
    { value: "H", label: "High (H)", description: "Admin privileges required" },
  ],
  UI: [
    {
      value: "N",
      label: "None (N)",
      description: "No user interaction required",
    },
    { value: "R", label: "Required (R)", description: "User must interact" },
  ],
  S: [
    {
      value: "U",
      label: "Unchanged (U)",
      description: "Scope is limited to vulnerable component",
    },
    {
      value: "C",
      label: "Changed (C)",
      description: "Scope extends beyond vulnerable component",
    },
  ],
  C: [
    { value: "N", label: "None (N)", description: "No impact" },
    { value: "L", label: "Low (L)", description: "Some information disclosed" },
    {
      value: "H",
      label: "High (H)",
      description: "Total information disclosure",
    },
  ],
  I: [
    { value: "N", label: "None (N)", description: "No impact" },
    { value: "L", label: "Low (L)", description: "Limited data modification" },
    { value: "H", label: "High (H)", description: "Total data compromise" },
  ],
  A: [
    { value: "N", label: "None (N)", description: "No impact" },
    {
      value: "L",
      label: "Low (L)",
      description: "Reduced performance/availability",
    },
    {
      value: "H",
      label: "High (H)",
      description: "Total loss of availability",
    },
  ],
} as const;

// Base score lookup values from CVSS v3.1 specification
const ATTACK_VECTOR = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const ATTACK_COMPLEXITY = { L: 0.77, H: 0.44 };
const PRIVILEGES_REQUIRED = {
  U: { N: 0.85, L: 0.62, H: 0.27 }, // Scope Unchanged
  C: { N: 0.85, L: 0.68, H: 0.5 }, // Scope Changed
};
const USER_INTERACTION = { N: 0.85, R: 0.62 };
const CONFIDENTIALITY = { N: 0, L: 0.22, H: 0.56 };
const INTEGRITY = { N: 0, L: 0.22, H: 0.56 };
const AVAILABILITY = { N: 0, L: 0.22, H: 0.56 };

/**
 * Calculate CVSS v3.1 Base Score
 */
export function calculateCVSSScore(metrics: CVSSMetrics): number {
  // Impact Sub-Score
  const impactBase =
    1 -
    (1 - CONFIDENTIALITY[metrics.C]) *
      (1 - INTEGRITY[metrics.I]) *
      (1 - AVAILABILITY[metrics.A]);

  let impact: number;
  if (metrics.S === "U") {
    // Scope Unchanged
    impact = 6.42 * impactBase;
  } else {
    // Scope Changed
    impact = 7.52 * (impactBase - 0.029) - 3.25 * (impactBase - 0.02) ** 15;
  }

  // Exploitability Sub-Score
  const exploitability =
    8.22 *
    ATTACK_VECTOR[metrics.AV] *
    ATTACK_COMPLEXITY[metrics.AC] *
    PRIVILEGES_REQUIRED[metrics.S][metrics.PR] *
    USER_INTERACTION[metrics.UI];

  // Base Score
  let baseScore: number;
  if (impact <= 0) {
    baseScore = 0;
  } else if (metrics.S === "U") {
    baseScore = Math.min(impact + exploitability, 10);
  } else {
    baseScore = Math.min(1.08 * (impact + exploitability), 10);
  }

  // Round up to one decimal place
  return Math.ceil(baseScore * 10) / 10;
}

/**
 * Generate CVSS v3.1 Vector String
 */
export function generateCVSSVector(metrics: CVSSMetrics): string {
  return `CVSS:3.1/AV:${metrics.AV}/AC:${metrics.AC}/PR:${metrics.PR}/UI:${metrics.UI}/S:${metrics.S}/C:${metrics.C}/I:${metrics.I}/A:${metrics.A}`;
}

/**
 * Parse CVSS v3.1 Vector String
 */
export function parseCVSSVector(vector: string): CVSSMetrics | null {
  try {
    // Match CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H format
    const match = vector.match(
      /^CVSS:3\.1\/AV:([NALP])\/AC:([LH])\/PR:([NLH])\/UI:([NR])\/S:([UC])\/C:([NLH])\/I:([NLH])\/A:([NLH])$/,
    );

    if (!match) {
      return null;
    }

    return {
      AV: match[1] as CVSSMetrics["AV"],
      AC: match[2] as CVSSMetrics["AC"],
      PR: match[3] as CVSSMetrics["PR"],
      UI: match[4] as CVSSMetrics["UI"],
      S: match[5] as CVSSMetrics["S"],
      C: match[6] as CVSSMetrics["C"],
      I: match[7] as CVSSMetrics["I"],
      A: match[8] as CVSSMetrics["A"],
    };
  } catch {
    return null;
  }
}

/**
 * Get severity rating from CVSS score
 */
export function getCVSSSeverity(
  score: number,
): "None" | "Low" | "Medium" | "High" | "Critical" {
  if (score === 0) return "None";
  if (score < 4.0) return "Low";
  if (score < 7.0) return "Medium";
  if (score < 9.0) return "High";
  return "Critical";
}

/**
 * Default metrics (all lowest values)
 */
export const DEFAULT_CVSS_METRICS: CVSSMetrics = {
  AV: "N",
  AC: "L",
  PR: "N",
  UI: "N",
  S: "U",
  C: "N",
  I: "N",
  A: "N",
};
