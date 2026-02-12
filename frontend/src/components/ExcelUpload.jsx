import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadExcelFile, validateExcelFile } from "../services/uploadService";
import { updateBatchPaymentMethod } from "../services/paymentService";
import {
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Alert from "./ui/Alert";
import Table from "./ui/Table";
import Badge from "./ui/Badge";
import { LoadingOverlay, Spinner } from "./ui/Loading";

function ExcelUpload({ onDataUpload, defaultMethod = null, onNavigateToCampaignSelection }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      setError(null);
      setValidationErrors([]);
      setParsedData(null);
      setUploadResult(null);
      validateFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  const validateFile = async (file) => {
    setLoading(true);
    setError(null);
    setValidationErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await validateExcelFile(formData);

      if (response.success) {
        const { validationReport, preview } = response.data;

        // Always show parsed data in preview so we can highlight problems
        setParsedData(preview);

        if (validationReport.isValid) {
          setValidationErrors([]);
          setError(null);
          onDataUpload(preview);
        } else {
          // File parsed successfully but has validation errors
          setValidationErrors(validationReport.errors || []);
          setError(null); // Don't show generic error, show detailed validation errors instead
        }
      } else {
        // Handle case where response.success is false
        setError("Failed to validate file: " + (response.message || "Unknown error"));
        setValidationErrors([]);
      }
    } catch (err) {
      console.error("Validation error:", err);

      // Check if this is a validation error response (400 status with errors)
      if (err.status === 400 && err.errors) {
        // This is likely a validation error response from the server
        if (Array.isArray(err.errors)) {
          setValidationErrors(err.errors);
          setError(null);
        } else {
          // Check if err.errors contains validationReport
          if (err.errors.validationReport && err.errors.validationReport.errors) {
            setValidationErrors(err.errors.validationReport.errors);
            setError(null);
          } else {
            setError("Validation failed: " + err.message);
            setValidationErrors([]);
          }
        }
      } else {
        // This is a different type of error (network, parsing, etc.)
        setError("Error validating file: " + err.message);
        setValidationErrors([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayments = async () => {
    if (!file || !parsedData || validationErrors.length > 0) {
      setError("Please upload a valid file before processing payments");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("batchName", `Batch ${new Date().toLocaleDateString()}`);
      formData.append("description", `Uploaded from ${file.name}`);

      const response = await uploadExcelFile(formData);

      if (response.success) {
        let result = response.data;
        // If a default method is specified (e.g., giftogram), update the batch
        if (defaultMethod && result?.batch?.batchId && result?.batch?.paymentMethod !== defaultMethod) {
          try {
            const methodResp = await updateBatchPaymentMethod(result.batch.batchId, defaultMethod, {});
            if (methodResp.success && methodResp.data?.batch) {
              result = { ...result, batch: methodResp.data.batch };
            } else {
              // Fallback local update for UI consistency
              result = { ...result, batch: { ...result.batch, paymentMethod: defaultMethod } };
            }
          } catch (_) {
            // Keep UI responsive even if method update fails; user can configure later
            result = { ...result, batch: { ...result.batch, paymentMethod: defaultMethod } };
          }
        }
        setUploadResult(result);
        setError(null);
        // Notify parent component about successful upload
        if (onDataUpload) {
          onDataUpload(result);
        }
        // Navigate to campaign selection page after successful upload
        if (onNavigateToCampaignSelection) {
          onNavigateToCampaignSelection();
        }
      }
    } catch (err) {
      setError("Error uploading file: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Helpers for the data preview table
  const isGiftogramUpload = defaultMethod === "giftogram";
  const getPreviewHeaders = (data) => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter(
      (header) => !(isGiftogramUpload && header.toLowerCase() === "currency")
    );
  };

  const formatPreviewCellValue = (value) => {
    return typeof value === "number" ? value.toFixed(2) : value;
  };

  // Email validation (frontend)
  // Rules:
  // - no spaces
  // - exactly one "@"
  // - no consecutive dots
  // - domain cannot start with "." or "-"
  // - domain labels cannot start or end with "-"
  // - final TLD at least 2 characters
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const getRowEmail = (row) => {
    // Try several common email key variants just in case
    return (
      row.recipientEmail ||
      row.email ||
      row.RecipientEmail ||
      row.RECIPIENTEMAIL ||
      row.recipient_email ||
      ""
    ).toString();
  };

  const isEmailInvalid = (row) => {
    const email = getRowEmail(row).trim();
    if (!email) return true; // missing email is invalid

    if (!basicEmailRegex.test(email)) return true;

    const [localPart, domainPart] = email.split("@");
    if (!localPart || !domainPart) return true;

    // No consecutive dots anywhere
    if (email.includes("..")) return true;

    // Domain must not start with "." or "-"
    if (domainPart.startsWith(".") || domainPart.startsWith("-")) return true;

    // Each domain label cannot start or end with "-"
    const domainLabels = domainPart.split(".");
    if (
      domainLabels.some(
        (label) =>
          !label || label.startsWith("-") || label.endsWith("-")
      )
    ) {
      return true;
    }

    // Final TLD should be at least 2 characters (already enforced by regex, but double‑check)
    const tld = domainLabels[domainLabels.length - 1];
    if (!tld || tld.length < 2) return true;

    return false;
  };

  // Map rowNumber -> validation error for non-email fields / messages
  const getRowValidation = (row) => {
    if (!validationErrors || validationErrors.length === 0) return null;
    return validationErrors.find((err) => err.row === row.rowNumber) || null;
  };

  // Block processing if any row has an invalid email (frontend check)
  const hasAnyInvalidEmails = parsedData ? parsedData.some((row) => isEmailInvalid(row)) : false;
  const hasAnyValidationErrors = hasAnyInvalidEmails || (validationErrors && validationErrors.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white"></h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2">
          <p className="text-gray-600 dark:text-gray-400">
            Upload an Excel file (.xlsx, .xls) or CSV file with payment details. Required columns: email, amount, name
          </p>
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowDownTrayIcon className="w-4 h-4" />}
            className="mt-2 sm:mt-0 sm:ml-4"
            onClick={() => {
              const link = document.createElement("a");
              link.href = "/sample-template.csv";
              link.download = "sample-template.csv";
              link.click();
            }}
          >
            Download Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dropzone */}
        <Card className="p-0 overflow-hidden">
          <div
            {...getRootProps()}
            className={`
              p-8 text-center cursor-pointer border-2 border-dashed transition-all duration-200
              ${
                isDragActive
                  ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }
            `}
          >
            <input {...getInputProps()} />
            <CloudArrowUpIcon
              className={`
              w-12 h-12 mx-auto mb-4 transition-colors duration-200
              ${isDragActive ? "text-primary-600" : "text-gray-400"}
            `}
            />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {isDragActive ? "Drop the file here" : "Drag & drop file here"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">or click to select file</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Supports .xlsx, .xls, .csv files (Max: 10MB)</p>
          </div>
        </Card>

        {/* File Details */}
        {file && (
          <Card>
            <Card.Header title="File Details" actions={<DocumentIcon className="w-6 h-6 text-primary-600" />} />
            <Card.Content>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Name:</span>
                  <span className="text-sm text-gray-900 dark:text-white truncate ml-2">{file.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Size:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{getFileSize(file.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Type:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{file.type || "Unknown"}</span>
                </div>
                {parsedData && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Rows:</span>
                    <Badge variant="primary">{parsedData.length}</Badge>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        )}
      </div>

      {loading && (
        <Card className="p-8">
          <div className="flex flex-col items-center space-y-4">
            <Spinner size="lg" />
            <p className="text-gray-600 dark:text-gray-400">Processing file...</p>
          </div>
        </Card>
      )}

      {error && (
        <Alert variant="error" title="Upload Error">
          {error}
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert variant="warning" title={`Validation Errors Found (${validationErrors.length} rows affected)`}>
          <div className="mt-3 space-y-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Please fix the following errors in your file before proceeding:
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {validationErrors.map((error, index) => (
                <div
                  key={index}
                  className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md border border-amber-200 dark:border-amber-700"
                >
                  <div className="flex items-start space-x-2">
                    <ExclamationCircleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-amber-800 dark:text-amber-200 text-sm">Row {error.row}</div>
                      <div className="mt-1 space-y-1">
                        {error.fieldErrors
                          ? // Show field-specific errors if available
                            Object.entries(error.fieldErrors).map(([field, fieldError]) => (
                              <div key={field} className="text-xs text-amber-700 dark:text-amber-300">
                                <span className="font-medium capitalize">
                                  {field.replace(/([A-Z])/g, " $1").trim()}:
                                </span>{" "}
                                {fieldError}
                              </div>
                            ))
                          : // Fallback to general errors
                            error.errors.map((errorMsg, errorIndex) => (
                              <div key={errorIndex} className="text-xs text-amber-700 dark:text-amber-300">
                                {errorMsg}
                              </div>
                            ))}
                      </div>
                      {error.data && (
                        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                          <div className="font-medium text-gray-600 dark:text-gray-400 mb-1">Current data:</div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700 dark:text-gray-300">
                            <div>
                              <span className="font-medium">Name:</span> "{error.data.recipientName || "N/A"}"
                            </div>
                            <div>
                              <span className="font-medium">Email:</span> "{error.data.recipientEmail || "N/A"}"
                            </div>
                            <div>
                              <span className="font-medium">Amount:</span> "{error.data.amount || "N/A"}"
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-300 border-t border-amber-200 dark:border-amber-700 pt-2">
              <strong>Tip:</strong> Download the template to see the correct format, or fix the errors above and upload
              again.
            </div>
          </div>
        </Alert>
      )}

      {uploadResult && (
        <Alert variant="success" title="File Uploaded Successfully!">
          <div className="mt-2 space-y-1">
            <p>
              <span className="font-medium">Batch ID:</span> {uploadResult.batch.batchId}
            </p>
            <p>
              <span className="font-medium">Total Payments:</span> {uploadResult.batch.totalPayments}
            </p>
            <p>
              <span className="font-medium">Total Amount:</span> ${uploadResult.batch.totalAmount.toFixed(2)}
            </p>
          </div>
        </Alert>
      )}

      {parsedData && (
        <>
          {hasAnyInvalidEmails && (
            <Alert variant="warning" title="Invalid email addresses found">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Some rows have <span className="font-semibold">invalid email addresses</span>. Please correct the
                highlighted rows in your Excel/CSV file and upload again.
              </p>
            </Alert>
          )}

          <Card>
          <Card.Header
            title={`Data Preview (${parsedData.length} rows)`}
            actions={
              !hasAnyValidationErrors && (
                <Button
                  variant="primary"
                  icon={<CheckCircleIcon className="w-4 h-4" />}
                  onClick={handleProcessPayments}
                  loading={loading}
                >
                  {isGiftogramUpload ? "Continue to Campaign Selection" : "Process Payments"}
                </Button>
              )
            }
          />
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <Table.Header>
                  <Table.Row>
                    {getPreviewHeaders(parsedData).map((header) => (
                      <Table.Head key={header}>{header}</Table.Head>
                    ))}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {parsedData.map((row, index) => {
                    const hasEmailError = isEmailInvalid(row);

                    return (
                      <Table.Row key={index}>
                        {getPreviewHeaders(parsedData).map((header) => {
                          const isEmailColumn = header.toLowerCase().includes("email");
                          const cellHasError = isEmailColumn && hasEmailError;

                          return (
                            <Table.Cell
                              key={header}
                              className={
                                cellHasError
                                  ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                  : undefined
                              }
                            >
                              {formatPreviewCellValue(row[header])}
                            </Table.Cell>
                          );
                        })}
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>
          </Card.Content>
        </Card>
        </>
      )}
    </div>
  );
}

export default ExcelUpload;
