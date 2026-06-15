import type { ReactNode } from "react";

// Panel/card mềm dùng chung (cảm hứng Apple): bo góc lớn, viền mảnh, shadow mềm.
export function Surface({
  className = "",
  padded = true,
  children,
}: {
  className?: string;
  padded?: boolean;
  children: ReactNode;
}) {
  return <div className={`dc-card ${padded ? "p-4 sm:p-5" : ""} ${className}`}>{children}</div>;
}
