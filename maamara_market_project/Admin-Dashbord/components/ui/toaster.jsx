import { useTheme } from "@mui/material";
import { useToast } from "./toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { tokens } from "../../src/theme";

export function Toaster() {
  const toastContext = useToast();
  console.log("toastContext:", toastContext);
  console.log("Toast context:", useToast());

  const theme = useTheme();
  const colors = tokens(theme.palette.mode)


  if (!toastContext) {
    return null;
  }

  const { toasts = [] } = toastContext;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 space-y-3 w-full max-w-sm">
        {toasts.map(({ id, title, description, action, ...props }) => (
          <Toast
            key={id}
            {...props}
            className="dark:bg-gray-900 text-black dark:text-white shadow-lg rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700 flex flex-col gap-2 transition-all duration-300 ease-in-out"
          style={{backgroundColor:colors.primary[900]}}>
            <div className="flex flex-col space-y-1">
              {title && (
                <ToastTitle className="text-lg font-semibold" style={{color:colors.gray[100]}}>{title}</ToastTitle>
              )}
              {description && (
                <ToastDescription className="text-lg" style={{color:colors.gray[100]}}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action && <div className="mt-2">{action}</div>}
            <ToastClose className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-white" />
          </Toast>
        ))}
      </div>

      {/* This will define the position for Toasts to be rendered */}
      <ToastViewport className="fixed bottom-4 right-4 z-40 w-full max-w-sm" />
    </>
  );
}
