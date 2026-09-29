"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ToastOnMount({
  message,
  type = "error",
}: {
  message?: string;
  type?: "error" | "success";
}) {
  useEffect(() => {
    if (!message) return;
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
    // Only fire once per mount - not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
