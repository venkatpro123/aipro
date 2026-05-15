import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  className?: string;
  /** Max height of the scrollable container. Defaults to 600px. */
  maxHeight?: number | string;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
}

/**
 * Virtualized list using @tanstack/react-virtual.
 * Renders only visible rows — use for any list > 50 items.
 *
 * Usage:
 *   <VirtualList
 *     items={companies}
 *     estimateSize={72}
 *     maxHeight={480}
 *     renderItem={(c) => <CompanyRow company={c} />}
 *   />
 */
export function VirtualList<T>({
  items,
  estimateSize = 64,
  overscan = 5,
  className,
  maxHeight = 600,
  renderItem,
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey ? (index) => getItemKey(items[index], index) : undefined,
  });

  const totalHeight = rowVirtualizer.getTotalSize();
  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn("virtual-list", className)}
      style={{ maxHeight, overflowY: "auto" }}
    >
      <div className="virtual-list-inner" style={{ height: totalHeight }}>
        {virtualRows.map((virtualRow) => (
          <div
            key={virtualRow.key}
            className="virtual-list-row"
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal virtual list for card carousels */
interface VirtualCarouselProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function VirtualCarousel<T>({
  items,
  estimateSize = 280,
  overscan = 3,
  className,
  renderItem,
}: VirtualCarouselProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const totalWidth = colVirtualizer.getTotalSize();
  const virtualCols = colVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn("scroll-x", className)}
    >
      <div style={{ width: totalWidth, position: "relative", height: "100%" }}>
        {virtualCols.map((virtualCol) => (
          <div
            key={virtualCol.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: virtualCol.size,
              transform: `translateX(${virtualCol.start}px)`,
            }}
          >
            {renderItem(items[virtualCol.index], virtualCol.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
