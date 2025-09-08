import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Button from "./Button";

const Modal = ({ isOpen = false, onClose, title, children, footer, size = "md", className }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
    full: "max-w-full mx-4",
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div
          className={clsx(
            "relative transform rounded-xl bg-white dark:bg-gray-800 p-6 shadow-large transition-all",
            "animate-scale-in",
            sizeClasses[size],
            "w-full",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-center justify-between mb-4">
              {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  icon={<XMarkIcon className="w-5 h-5" />}
                  className="ml-auto -mr-2"
                />
              )}
            </div>
          )}

          {/* Content */}
          <div className="text-gray-600 dark:text-gray-300">{children}</div>

          {/* Footer */}
          {footer && <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">{footer}</div>}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
