// CollapsibleSection.tsx
// Accessible accordion wrapper for collapsible content.
// Uses native <details>/<summary> for zero-dependency accessibility.

import React, { ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
  defaultOpen = false,
  children,
}) => {
  return (
    <details
      className="collapsible-section"
      style={{
        border: "1px solid var(--border-2)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        marginBottom: "var(--space-6)",
      }}
      open={defaultOpen}
    >
      <summary
        className="cursor-pointer px-[var(--space-5)] py-[var(--space-4)] bg-[var(--alpha-bg-05)] hover:bg-[var(--alpha-bg-10)] transition-all select-none"
        style={{
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <span className="label-sm font-black tracking-tight uppercase">{title}</span>
        {description && (
          <span className="text-[10px] text-muted-foreground opacity-60 italic">{description}</span>
        )}
        <span
          className="ml-auto text-xs opacity-40 group-open:rotate-180 transition-transform"
          aria-hidden="true"
        >
          ▼
        </span>
      </summary>
      <div
        className="px-[var(--space-6)] py-[var(--space-6)] border-t border-[var(--border-2)]"
      >
        {children}
      </div>
    </details>
  );
};

export default CollapsibleSection;
