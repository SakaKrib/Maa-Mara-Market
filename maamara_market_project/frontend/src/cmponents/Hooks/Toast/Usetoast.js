import { useContext } from "react";
import { ToastContext } from "../../../../components/ui/toast"; // ✅ Fix the undefined

export const useToast = () => {
  const { addToast } = useContext(ToastContext);
  return { addToast };
};
