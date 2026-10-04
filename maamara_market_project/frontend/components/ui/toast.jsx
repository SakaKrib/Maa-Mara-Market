import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

// 🧠 Context for triggering toast from anywhere
export const ToastContext = React.createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([])

  const toast = ({
    title,
    description,
    variant = "default",
    duration = 3000,
  }) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, title, description, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }

  return (
    <ToastContext.Provider value={{ toast, toasts }}>
      <ToastPrimitives.Provider swipeDirection="right">
        {children}
      </ToastPrimitives.Provider>
    </ToastContext.Provider>
  )
  
}

// ✅ Hook for using toasts
export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

// 🧩 Radix Viewport
const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed z-[100] flex max-h-screen w-full flex-col-reverse gap-3 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] sm:w-[360px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

// 🎨 Variant-based styling
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-6 shadow-md transition-all duration-300 ease-in-out \
   data-[state=open]:animate-in data-[state=closed]:animate-out \
   data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full \
   data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-white text-black dark:bg-zinc-900 dark:text-white",
        destructive:
          "border-red-600 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
        success:
          "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300",
        warning:
          "border-yellow-600 bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
        info:
          "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// 🧱 Toast Wrapper
const Toast = React.forwardRef(({ className, variant, ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(toastVariants({ variant }), className)}
    {...props}
  />
))
Toast.displayName = ToastPrimitives.Root.displayName

// 🧱 Toast Title
const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-base font-semibold leading-tight tracking-wide", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

// 🧱 Toast Description
const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground mt-1", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

// ❌ Close Button
const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-offset-1",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

// 🧩 Optional Action Button
const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

// ✅ Export components
export {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastViewport,
}
