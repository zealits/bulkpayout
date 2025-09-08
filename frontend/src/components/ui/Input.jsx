import React from "react";
import clsx from "clsx";

const Input = ({ label, error, helper, icon, iconPosition = "left", className, inputClassName, ...props }) => {
  const inputClasses = clsx(
    "block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm transition-colors duration-200",
    "dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-400 dark:focus:ring-primary-400",
    error && "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-600",
    icon && iconPosition === "left" && "pl-10",
    icon && iconPosition === "right" && "pr-10",
    inputClassName
  );

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>}
      <div className="relative">
        {icon && (
          <div
            className={clsx(
              "absolute inset-y-0 flex items-center pointer-events-none",
              iconPosition === "left" ? "left-0 pl-3" : "right-0 pr-3"
            )}
          >
            <span className="text-gray-400 dark:text-gray-500 w-5 h-5">{icon}</span>
          </div>
        )}
        <input className={inputClasses} {...props} />
      </div>
      {helper && !error && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{helper}</p>}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default Input;
