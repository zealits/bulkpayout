import React from "react";
import { ExclamationTriangleIcon, ExclamationCircleIcon, ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import Alert from "./ui/Alert";
import Card from "./ui/Card";

function ErrorDisplay({ error, onRetry, onClose, title = "Error", showDetails = true }) {
  if (!error) return null;

  const getErrorVariant = (severity) => {
    switch (severity) {
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "error";
    }
  };

  const getErrorIcon = (severity) => {
    switch (severity) {
      case "warning":
        return ExclamationTriangleIcon;
      default:
        return ExclamationCircleIcon;
    }
  };

  const ErrorIcon = getErrorIcon(error.severity);

  return (
    <Card className="border-l-4 border-l-red-500">
      <div className="p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ErrorIcon className="w-6 h-6 text-red-600" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
            <div className="mt-2 text-gray-600 dark:text-gray-300">
              <p className="mb-3">{error.message}</p>

              {error.suggestion && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Suggestion:</strong> {error.suggestion}
                  </p>
                </div>
              )}

              {showDetails && error.details && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    View technical details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border text-sm">
                    <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                      {typeof error.details === "string" ? error.details : JSON.stringify(error.details, null, 2)}
                    </pre>
                  </div>
                </details>
              )}

              {(error.helpText || error.help_text) && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">{error.helpText || error.help_text}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {error.retryable && onRetry && (
                <Button variant="primary" onClick={onRetry} icon={<ArrowPathIcon className="w-4 h-4" />}>
                  {error.action || "Retry"}
                </Button>
              )}

              {onClose && (
                <Button variant="outline" onClick={onClose} icon={<XMarkIcon className="w-4 h-4" />}>
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ErrorDisplay;
