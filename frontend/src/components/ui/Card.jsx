import React from "react";
import clsx from "clsx";

const Card = ({ children, className, padding = "default", shadow = "soft", hover = false, ...props }) => {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    default: "p-6",
    lg: "p-8",
  };

  const shadowClasses = {
    none: "",
    soft: "shadow-soft",
    medium: "shadow-medium",
    large: "shadow-large",
  };

  const classes = clsx(
    "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700",
    paddingClasses[padding],
    shadowClasses[shadow],
    hover && "transition-all duration-200 hover:shadow-medium hover:-translate-y-1",
    className
  );

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ title, subtitle, actions, className, ...props }) => {
  return (
    <div className={clsx("flex items-center justify-between mb-4", className)} {...props}>
      <div>
        {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
};

const CardContent = ({ children, className, ...props }) => {
  return (
    <div className={clsx("text-gray-600 dark:text-gray-300", className)} {...props}>
      {children}
    </div>
  );
};

const CardFooter = ({ children, className, ...props }) => {
  return (
    <div className={clsx("mt-6 pt-4 border-t border-gray-200 dark:border-gray-700", className)} {...props}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
