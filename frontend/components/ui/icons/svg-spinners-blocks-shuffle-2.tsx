import * as React from "react";

export function BlocksShuffle2Icon({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="10" height="10" x="1" y="1" rx="1">
        <animate
          id="SVG7JagGz2Y"
          attributeName="x"
          begin="0;SVGgDT19bUV.end"
          dur="0.2s"
          values="1;13"
        />
        <animate
          id="SVGpS1BddYk"
          attributeName="y"
          begin="SVGc7yq8dne.end"
          dur="0.2s"
          values="1;13"
        />
        <animate
          id="SVGboa7EdFl"
          attributeName="x"
          begin="SVG0ZX9C6Fa.end"
          dur="0.2s"
          values="13;1"
        />
        <animate
          id="SVG6rrusL2C"
          attributeName="y"
          begin="SVGTOnnO5Dr.end"
          dur="0.2s"
          values="13;1"
        />
      </rect>
      <rect width="10" height="10" x="1" y="13" rx="1">
        <animate
          id="SVGc7yq8dne"
          attributeName="y"
          begin="SVG7JagGz2Y.end"
          dur="0.2s"
          values="13;1"
        />
        <animate
          id="SVG0ZX9C6Fa"
          attributeName="x"
          begin="SVGpS1BddYk.end"
          dur="0.2s"
          values="1;13"
        />
        <animate
          id="SVGTOnnO5Dr"
          attributeName="y"
          begin="SVGboa7EdFl.end"
          dur="0.2s"
          values="1;13"
        />
        <animate
          id="SVGgDT19bUV"
          attributeName="x"
          begin="SVG6rrusL2C.end"
          dur="0.2s"
          values="13;1"
        />
      </rect>
    </svg>
  );
}
