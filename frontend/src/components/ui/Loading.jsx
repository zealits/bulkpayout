import React from "react";
import clsx from "clsx";

export const Spinner = ({ size = "md", className }) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  return (
    <svg className={clsx("animate-spin text-primary-600", sizes[size], className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export const LoadingOverlay = ({ children, isLoading, className }) => {
  return (
    <div className={clsx("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center space-y-2">
            <Spinner size="lg" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const SkeletonLoader = ({ className, lines = 3 }) => {
  return (
    <div className={clsx("animate-pulse space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={clsx("h-4 bg-gray-200 dark:bg-gray-700 rounded", i === lines - 1 && "w-3/4")} />
      ))}
    </div>
  );
};

export default { Spinner, LoadingOverlay, SkeletonLoader };
