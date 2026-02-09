import * as React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface TabItem {
  value: string;
  label: string;
}

interface ResponsiveTabsListProps {
  tabs: TabItem[];
  className?: string;
  triggerClassName?: string;
  activeValue?: string;
  onValueChange?: (value: string) => void;
}

const ResponsiveTabsList = ({
  tabs,
  className,
  triggerClassName,
  activeValue,
  onValueChange,
}: ResponsiveTabsListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measuringRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(tabs.length);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const measuring = measuringRef.current;
    if (!container || !measuring) return;

    const moreButtonWidth = 100; // reserve space for "More" button
    const containerWidth = container.offsetWidth;
    const tabEls = measuring.children;
    let totalWidth = 0;
    let count = 0;

    for (let i = 0; i < tabEls.length; i++) {
      const tabWidth = (tabEls[i] as HTMLElement).offsetWidth;
      const widthIfMore = totalWidth + tabWidth + (i < tabEls.length - 1 ? moreButtonWidth : 0);
      
      if (i === tabEls.length - 1) {
        // Last tab — only need space for itself
        if (totalWidth + tabWidth <= containerWidth) {
          count++;
        }
      } else {
        if (widthIfMore <= containerWidth) {
          totalWidth += tabWidth;
          count++;
        } else {
          break;
        }
      }
    }

    // If all tabs fit, show all
    if (count === tabs.length) {
      setVisibleCount(tabs.length);
    } else {
      setVisibleCount(Math.max(1, count));
    }
  }, [tabs.length]);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(() => measure());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure, tabs]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const visibleTabs = tabs.slice(0, visibleCount);
  const overflowTabs = tabs.slice(visibleCount);
  const activeOverflow = overflowTabs.find((t) => t.value === activeValue);

  const defaultTriggerClass =
    "rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px] px-4 py-2.5 whitespace-nowrap";

  return (
    <>
      {/* Hidden measuring container */}
      <div
        ref={measuringRef}
        aria-hidden
        className="absolute invisible h-0 overflow-hidden flex"
        style={{ pointerEvents: "none" }}
      >
        {tabs.map((tab) => (
          <span key={tab.value} className={cn(defaultTriggerClass, triggerClassName, "inline-flex items-center")}>
            {tab.label}
          </span>
        ))}
      </div>

      <TabsPrimitive.List
        ref={containerRef}
        className={cn(
          "w-full flex items-center bg-transparent border-b border-border h-auto p-0 gap-0",
          className
        )}
      >
        {visibleTabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(defaultTriggerClass, triggerClassName)}
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}

        {overflowTabs.length > 0 && (
          <div ref={dropdownRef} className="relative ml-auto">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                defaultTriggerClass,
                "inline-flex items-center gap-1 cursor-pointer",
                activeOverflow && "border-foreground text-foreground"
              )}
            >
              {activeOverflow ? activeOverflow.label : "More"}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-popover border border-border rounded-md shadow-md py-1">
                {overflowTabs.map((tab) => (
                  <TabsPrimitive.Trigger
                    key={tab.value}
                    value={tab.value}
                    asChild
                  >
                    <button
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2 text-[13px] hover:bg-muted transition-colors cursor-pointer",
                        activeValue === tab.value && "bg-muted font-medium"
                      )}
                      onClick={() => {
                        onValueChange?.(tab.value);
                        setDropdownOpen(false);
                      }}
                    >
                      {tab.label}
                    </button>
                  </TabsPrimitive.Trigger>
                ))}
              </div>
            )}
          </div>
        )}
      </TabsPrimitive.List>
    </>
  );
};

export { ResponsiveTabsList };
export type { TabItem };
