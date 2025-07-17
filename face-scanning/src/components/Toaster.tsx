import React, { useState, useEffect, ReactNode } from "react";
import { ToastContext, Toast } from "@/hooks/use-toast";
import { X, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (toastData: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000,
      variant: "default",
      ...toastData,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxWidth: "400px",
      }}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const getVariantStyles = () => {
    switch (toast.variant) {
      case "destructive":
        return {
          backgroundColor: "#fef2f2",
          borderColor: "#fecaca",
          iconColor: "#dc2626",
          icon: XCircle,
        };
      case "success":
        return {
          backgroundColor: "#f0fdf4",
          borderColor: "#bbf7d0",
          iconColor: "#16a34a",
          icon: CheckCircle,
        };
      default:
        return {
          backgroundColor: "#f8fafc",
          borderColor: "#e2e8f0",
          iconColor: "#0ea5e9",
          icon: AlertCircle,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const Icon = variantStyles.icon;

  return (
    <div
      style={{
        backgroundColor: variantStyles.backgroundColor,
        border: `1px solid ${variantStyles.borderColor}`,
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        transform: isVisible ? "translateX(0)" : "translateX(100%)",
        opacity: isVisible ? 1 : 0,
        transition: "all 0.3s ease-in-out",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <Icon
          style={{
            width: "20px",
            height: "20px",
            color: variantStyles.iconColor,
            flexShrink: 0,
            marginTop: "2px",
          }}
        />
        <div style={{ flex: 1 }}>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: "600",
              margin: "0 0 4px 0",
              color: "#1f2937",
            }}
          >
            {toast.title}
          </h4>
          {toast.description && (
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: 0,
                lineHeight: "1.4",
              }}
            >
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={onRemove}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: "#9ca3af",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <X style={{ width: "16px", height: "16px" }} />
        </button>
      </div>
    </div>
  );
}

export default ToastProvider;