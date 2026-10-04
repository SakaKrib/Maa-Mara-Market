import { useToast } from "./toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
} from "./toast";

export function Toaster() {
  const toastContext = useToast();
  const { toasts = [] } = toastContext;

  return (
    <>
      <div className="fixed right-4 top-20 z-[1400] w-full max-w-sm space-y-3 px-4 sm:px-0">
        {toasts.map(({ id, title, description, action, ...props }) => (
          <Toast key={id} {...props} className="relative w-full rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
            <div className="min-w-0 pr-6">
              {title && <ToastTitle className="text-sm font-semibold text-card-foreground">{title}</ToastTitle>}
              {description && <ToastDescription className="mt-1 text-sm font-normal text-card-foreground">{description}</ToastDescription>}
              {action && <div className="mt-2">{action}</div>}
            </div>
            <ToastClose className="absolute right-3 top-3 text-xs text-muted-foreground hover:text-card-foreground" />
          </Toast>
        ))}
      </div>

      {/* This will define the position for Toasts to be rendered */}
    </>
  );
}
