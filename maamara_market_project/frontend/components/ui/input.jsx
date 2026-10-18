import * as React from "react"

import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, value, ...props }, ref) => {
  // Only control the field when a value prop is supplied. Forcing value="" on
  // every input locks uncontrolled fields (react-hook-form register(), refs),
  // so typing is ignored. A null value is still normalised to "".
  const valueProps = value === undefined ? {} : { value: value === null ? "" : value };

  return (
    <input
      type={type}
      className={cn(
        "flex min-h-10 w-full rounded-[20px] border border-input bg-transparent px-3 py-2 text-sm leading-6 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...valueProps}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
