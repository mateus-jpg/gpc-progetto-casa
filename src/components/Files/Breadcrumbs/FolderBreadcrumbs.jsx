"use client";

import { ChevronRight, Home } from "lucide-react";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile-optimized breadcrumb trail — horizontally scrollable, always shows current location.
 */
export default function FolderBreadcrumbs({ breadcrumbs = [], onNavigate }) {
  const scrollRef = useRef(null);

  // Auto-scroll to end so current folder is always visible
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [breadcrumbs]);

  return (
    <div
      ref={scrollRef}
      className="flex items-center overflow-x-auto px-4 py-2.5 gap-0.5"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
    >
      {/* Root */}
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors",
          breadcrumbs.length === 0
            ? "text-stone-900 bg-stone-100"
            : "text-stone-500 active:bg-stone-100",
        )}
      >
        <Home className="w-3.5 h-3.5" />
        <span>Root</span>
      </button>

      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <div key={crumb.id} className="flex items-center flex-shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-stone-300 mx-0.5 flex-shrink-0" />
            <button
              type="button"
              onClick={() => !isLast && onNavigate(crumb.id)}
              className={cn(
                "px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors",
                isLast
                  ? "text-stone-900 bg-stone-100 cursor-default"
                  : "text-stone-500 active:bg-stone-100",
              )}
            >
              {crumb.nome}
            </button>
          </div>
        );
      })}
    </div>
  );
}
