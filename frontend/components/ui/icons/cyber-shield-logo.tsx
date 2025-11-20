import * as React from "react";

interface CyberShieldLogoProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * CYOPS Logo
 *
 * A shield icon with integrated circuit board patterns representing:
 * - Shield: Security, protection, defense
 * - Circuit patterns: Technology, digital operations
 * - Central node: Central command, unified operations
 *
 * Design elements:
 * - Modern geometric shield shape
 * - Circuit board pathways suggesting data flow and connectivity
 * - Central connection point representing centralized security operations
 * - Clean, professional appearance suitable for enterprise cybersecurity
 */
export function CyberShieldLogo({
  size = 24,
  className = "",
  strokeWidth = 2,
}: CyberShieldLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield Outline */}
      <path
        d="M12 2L4 6V11C4 16.55 7.84 21.74 12 23C16.16 21.74 20 16.55 20 11V6L12 2Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Circuit Board Pattern - Horizontal Lines */}
      <path
        d="M8 10H10"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
      <path
        d="M14 10H16"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
      <path
        d="M8 14H10"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
      <path
        d="M14 14H16"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />

      {/* Circuit Board Pattern - Vertical Lines */}
      <path
        d="M10 8V10"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
      <path
        d="M14 8V10"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
      <path
        d="M10 14V16"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />
      <path
        d="M14 14V16"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.8}
        strokeLinecap="round"
      />

      {/* Central Node - Represents Central Operations Hub */}
      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle cx="12" cy="12" r="1" fill="currentColor" />

      {/* Connection Points - Small Nodes at Circuit Intersections */}
      <circle cx="10" cy="10" r="0.8" fill="currentColor" />
      <circle cx="14" cy="10" r="0.8" fill="currentColor" />
      <circle cx="10" cy="14" r="0.8" fill="currentColor" />
      <circle cx="14" cy="14" r="0.8" fill="currentColor" />
    </svg>
  );
}
