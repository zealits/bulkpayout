import React from "react";
import clsx from "clsx";

const Table = ({ children, className, ...props }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className={clsx("min-w-full divide-y divide-gray-200 dark:divide-gray-700", className)} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
};

const TableHeader = ({ children, className, ...props }) => {
  return (
    <thead className={clsx("bg-gray-50 dark:bg-gray-800", className)} {...props}>
      {children}
    </thead>
  );
};

const TableBody = ({ children, className, ...props }) => {
  return (
    <tbody
      className={clsx("divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900", className)}
      {...props}
    >
      {children}
    </tbody>
  );
};

const TableRow = ({ children, className, ...props }) => {
  return (
    <tr
      className={clsx("hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150", className)}
      {...props}
    >
      {children}
    </tr>
  );
};

const TableHead = ({ children, className, ...props }) => {
  return (
    <th
      className={clsx(
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
};

const TableCell = ({ children, className, ...props }) => {
  return (
    <td className={clsx("px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100", className)} {...props}>
      {children}
    </td>
  );
};

Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;

export default Table;
