import React from "react";
import clsx from "clsx";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const Alert = ({ variant = "info", title, children, onClose, className, ...props }) => {
  const variants = {
    success: {
      container: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700",
      icon: "text-green-400",
      title: "text-green-800 dark:text-green-200",
      content: "text-green-700 dark:text-green-300",
      IconComponent: CheckCircleIcon,
    },
    warning: {
      container: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700",
      icon: "text-yellow-400",
      title: "text-yellow-800 dark:text-yellow-200",
      content: "text-yellow-700 dark:text-yellow-300",
      IconComponent: ExclamationTriangleIcon,
    },
    error: {
      container: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700",
      icon: "text-red-400",
      title: "text-red-800 dark:text-red-200",
      content: "text-red-700 dark:text-red-300",
      IconComponent: ExclamationCircleIcon,
    },
    info: {
      container: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700",
      icon: "text-blue-400",
      title: "text-blue-800 dark:text-blue-200",
      content: "text-blue-700 dark:text-blue-300",
      IconComponent: InformationCircleIcon,
    },
  };

  const config = variants[variant];
  const IconComponent = config.IconComponent;

  return (
    <div className={clsx("rounded-lg border p-4", config.container, className)} {...props}>
      <div className="flex">
        <div className="flex-shrink-0">
          <IconComponent className={clsx("h-5 w-5", config.icon)} />
        </div>
        <div className="ml-3 flex-1">
          {title && <h3 className={clsx("text-sm font-medium", config.title)}>{title}</h3>}
          <div className={clsx("text-sm", config.content, title && "mt-2")}>{children}</div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={clsx(
                  "inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
                  config.content,
                  "hover:bg-black hover:bg-opacity-10"
                )}
              >
                <span className="sr-only">Dismiss</span>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
