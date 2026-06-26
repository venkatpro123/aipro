import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface SelectOption {
  key: string;
  label: string;
  icon?: string | React.ReactNode;
  cat?: string;
  color?: string;
}

export interface PremiumSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  groups?: Record<string, SelectOption[]>;
}

const PremiumSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  label,
  disabled = false,
  className,
  groups,
}: PremiumSelectProps) => {
  const selectedOption = options.find((opt) => opt.key === value);

  return (
    <div className={cn("flex flex-col gap-[var(--space-2)]", className)}>
      {label && <label className="label-xs text-muted-foreground font-black uppercase tracking-widest">{label}</label>}
      <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full"
        >
          <SelectPrimitive.Trigger className="select-trigger group">
            <div className="flex items-center gap-[var(--space-3)] overflow-hidden">
              {selectedOption?.icon && (
                <span className="select-item-icon shrink-0 text-lg flex items-center justify-center">
                  {selectedOption.icon}
                </span>
              )}
              <div className="truncate font-bold tracking-tight">
                <SelectPrimitive.Value placeholder={placeholder} />
              </div>
            </div>
            <SelectPrimitive.Icon className="shrink-0 transition-transform group-data-[state=open]:rotate-180">
              <ChevronDown className="w-4 h-4 opacity-50 font-black" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
        </motion.div>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content 
            className="select-content" 
            position="popper" 
            sideOffset={8}
          >
            <SelectPrimitive.ScrollUpButton className="select-scroll-btn">
              <ChevronUp className="w-4 h-4" />
            </SelectPrimitive.ScrollUpButton>
            
            <SelectPrimitive.Viewport className="select-viewport custom-scrollbar">
              {groups ? (
                Object.entries(groups).map(([groupName, groupOptions]) => (
                  <SelectPrimitive.Group key={groupName}>
                    <SelectPrimitive.Label className="px-[var(--space-4)] py-[var(--space-2)] text-[10px] font-black uppercase text-[var(--text)]/20 tracking-[0.2em]">{groupName}</SelectPrimitive.Label>
                    {groupOptions.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key} option={opt} />
                    ))}
                    <SelectPrimitive.Separator className="h-px bg-[var(--alpha-bg-05)] my-[var(--space-2)]" />
                  </SelectPrimitive.Group>
                ))
              ) : (
                options.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key} option={opt} />
                ))
              )}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="select-scroll-btn">
              <ChevronDown className="w-4 h-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
};

const SelectItem = React.forwardRef<
  HTMLDivElement,
  { option: SelectOption } & React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ option, className, ...props }, ref) => {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn("select-item", className)}
      style={option.color ? { ['--item-accent' as any]: option.color } : undefined}
      {...props}
    >
      <span className="select-item-icon" style={option.color ? { color: option.color } : undefined}>
        {option.icon}
      </span>
      <SelectPrimitive.ItemText>
        <span className="select-item-label" style={option.color ? { color: option.color } : undefined}>
          {option.label}
        </span>
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <Check className="w-4 h-4" style={{ color: option.color || 'var(--cyan)' }} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = "SelectItem";

export { PremiumSelect };
