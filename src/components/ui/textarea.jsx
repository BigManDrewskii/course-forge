import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ 
  className, 
  error,
  id,
  ...props 
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div className="space-y-1">
      <textarea
        id={textareaId}
        data-slot="textarea"
        className={cn(
          // Base styles with mobile font size requirement (≥16px) to prevent zoom
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // Enhanced error state with increased contrast
          error 
            ? "aria-invalid:ring-destructive/30 dark:aria-invalid:ring-destructive/50 aria-invalid:border-destructive border-destructive focus-visible:ring-destructive/30"
            : "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        ref={ref}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      {error && (
        <p 
          id={`${textareaId}-error`}
          className="text-sm text-destructive font-medium"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
