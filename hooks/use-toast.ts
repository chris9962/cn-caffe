import { useContext } from "react";
import { ToastContext } from "@/components/ui/toast";

export function useToast() {
  return useContext(ToastContext);
}
