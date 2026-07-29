import * as React from "react";

function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}

const sizeMap = {
  default: { btn: "text-base font-medium", text: "px-6 py-3.5" },
  sm:      { btn: "text-sm font-medium",   text: "px-4 py-2" },
  lg:      { btn: "text-lg font-medium",   text: "px-8 py-4" },
  icon:    { btn: "h-10 w-10",             text: "flex h-10 w-10 items-center justify-center" },
};

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: keyof typeof sizeMap;
  contentClassName?: string;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, size = "default", contentClassName, ...props }, ref) => {
    const s = sizeMap[size] ?? sizeMap.default;
    return (
      <div className={cn("glass-button-wrap cursor-pointer rounded-full", className)}>
        <button
          className={cn("glass-button relative isolate cursor-pointer rounded-full transition-all", s.btn)}
          ref={ref}
          {...props}
        >
          <span className={cn("glass-button-text relative block select-none tracking-tighter", s.text, contentClassName)}>
            {children}
          </span>
        </button>
        <div className="glass-button-shadow rounded-full" />
      </div>
    );
  }
);
GlassButton.displayName = "GlassButton";

export { GlassButton };
