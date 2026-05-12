import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface PremiumTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  mobilePillMode?: boolean;
}

export const PremiumTabs: React.FC<PremiumTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}) => {
  return (
    <TabsPrimitive.Root
      value={activeTab}
      onValueChange={onTabChange}
      className={cn("w-full", className)}
    >
      {/* Premium tab strip with layoutId sliding pill */}
      <div className="relative mb-8">
        <TabsPrimitive.List
          className="dashboard-tabs-strip"
          aria-label="Dashboard sections"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <TabsPrimitive.Trigger
                key={tab.value}
                value={tab.value}
                className={cn("dashboard-tab-btn", isActive && "active")}
                aria-label={`Switch to ${tab.label}`}
                style={{ position: "relative" }}
              >
                {/* Framer Motion sliding background pill — animates between tabs */}
                {isActive && (
                  <motion.span
                    layoutId="tab-active-bg"
                    transition={{ type: "spring", stiffness: 380, damping: 36 }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "var(--radius-full)",
                      background: "rgba(255,255,255,0.13)",
                      boxShadow:
                        "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.10) inset, 0 0 14px rgba(0,212,224,0.10)",
                      zIndex: 0,
                    }}
                  />
                )}

                {/* Icon — springs on activation */}
                {tab.icon && (
                  <motion.span
                    animate={{
                      scale: isActive ? 1.18 : 1,
                      filter: isActive ? "brightness(1.3)" : "brightness(1)",
                    }}
                    transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      position: "relative",
                      zIndex: 1,
                      opacity: isActive ? 1 : 0.65,
                    }}
                  >
                    {tab.icon}
                  </motion.span>
                )}

                {/* Label */}
                <span
                  className="tab-label-text whitespace-nowrap"
                  style={{ position: "relative", zIndex: 1 }}
                >
                  {tab.label}
                </span>
              </TabsPrimitive.Trigger>
            );
          })}
        </TabsPrimitive.List>
      </div>

      {/* Tab content with smooth directional transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10, scale: 0.994 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.994 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="focus-visible:outline-none"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </TabsPrimitive.Root>
  );
};

export default PremiumTabs;
