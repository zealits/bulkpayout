import React, { useState, useEffect } from "react";
import { processPaymentBatch, getPaymentsByBatch } from "../services/paymentService";
import { processGiftogramBatchStream } from "../services/giftogramService";
import { useEnvironment } from "../contexts/EnvironmentContext";
import {
  CreditCardIcon,
  CheckIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  GiftIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Alert from "./ui/Alert";
import Table from "./ui/Table";
import Input from "./ui/Input";
import Badge from "./ui/Badge";
import Modal from "./ui/Modal";
import { LoadingOverlay, Spinner } from "./ui/Loading";
import ErrorDisplay from "./ErrorDisplay";
import PaymentMethodSelector from "./PaymentMethodSelector";

function PaymentPreview({ data, defaultMethod = "paypal" }) {
  const { environment } = useEnvironment();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [processing, setProcessing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [batchInfo, setBatchInfo] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState(defaultMethod || "paypal");
  const [currencyCode, setCurrencyCode] = useState("");
  const [streamProgress, setStreamProgress] = useState({ sent: 0, total: 0 });

  // If data is from upload result, extract batch info
  useEffect(() => {
    if (data) {
      if (data.batch) {
        // Data from upload result
        setBatchInfo(data.batch);
        // In section-specific screens (e.g., Gift Cards), prefer the provided defaultMethod
        // so the header and actions match the selected section even if the batch has another method.
        setCurrentPaymentMethod(defaultMethod || data.batch.paymentMethod || "paypal");

        // Try to initialize currency from batch data if available
        if (Array.isArray(data.batch.currencies) && data.batch.currencies.length > 0) {
          setCurrencyCode(data.batch.currencies[0]);
        }
        loadPayments(data.batch.batchId);
      } else if (Array.isArray(data)) {
        // Legacy data array
        setPayments(data);
      }
    }
  }, [data, environment]);

  const loadPayments = async (batchId) => {
    try {
      const response = await getPaymentsByBatch(batchId, 1, 100); // Load all payments
      if (response.success) {
        setPayments(response.data);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
      setError({
        ...error,
        message: error.message || "Failed to load payment data",
        suggestion: "Please try refreshing the page or contact support if the issue persists.",
        action: "Refresh payment data",
      });
    }
  };

  const getPageTitle = () =>
    currentPaymentMethod === "giftogram" ? "Select Campaign" : "Payment Preview";

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getPageTitle()}</h1>
        <Alert variant="info">No data available. Please upload an Excel file first.</Alert>
      </div>
    );
  }

  const displayData = payments.length > 0 ? payments : Array.isArray(data) ? data : [];
  const totalPages = Math.ceil(displayData.length / rowsPerPage);
  const paginatedData = displayData.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleProcessPayments = async () => {
    if (!batchInfo) {
      setError({
        message: "No batch information available",
        severity: "warning",
        suggestion: "Please upload a payment file first.",
        action: "Upload payment data",
      });
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccessMessage(null);
    const totalToProcess = payments.length || displayData.length || 0;
    setStreamProgress({ sent: 0, total: currentPaymentMethod === "giftogram" ? totalToProcess : 0 });

    try {
      let response;

      if (currentPaymentMethod === "giftogram") {
        // Require campaign configuration to be saved before sending
        if (!batchInfo.giftogramCampaignId) {
          setError({
            message: "Please save your gift card campaign before sending gift cards.",
            severity: "warning",
            suggestion: "Configure the campaign and click \"Save Campaign\" above, then try again.",
            action: "Save campaign",
          });
          setProcessing(false);
          return;
        }

        const giftogramConfig = {
          campaignId: batchInfo.giftogramCampaignId,
          message: batchInfo.giftogramMessage || "Thank you for your hard work! Enjoy your gift card!",
          subject: batchInfo.giftogramSubject || "You have received a gift card!",
        };

        const result = await processGiftogramBatchStream(
          batchInfo.batchId,
          giftogramConfig,
          (event) => {
            setStreamProgress({ sent: event.sent, total: event.total });
            setPayments((prev) =>
              prev.map((p) =>
                (p._id && String(p._id) === event.paymentId) || p.recipientEmail === event.email
                  ? { ...p, status: event.status, errorMessage: event.errorMessage ?? p.errorMessage }
                  : p
              )
            );
          }
        );

        response = {
          success: true,
          data: {
            summary: {
              successful: result.successful,
              failed: result.failed,
            },
            hasFailures: result.hasFailures,
          },
        };
      } else if (currentPaymentMethod === "paypal") {
        // Process with PayPal
        response = await processPaymentBatch(batchInfo.batchId, {
          email_subject: "You have a payout!",
          email_message: "You have received a payout! Thanks for using our service!",
        });
      } else {
        throw new Error("Unsupported payment method");
      }

      if (response.success) {
        const methodName = currentPaymentMethod === "giftogram" ? "gift cards" : "payments";

        // Handle different success scenarios for Giftogram
        if (currentPaymentMethod === "giftogram" && response.data?.hasFailures) {
          const { successful, failed } = response.data.summary;
          setSuccessMessage(
            `${methodName} processing completed: ${successful} successful, ${failed} failed. Check individual statuses below.`
          );
        } else {
          setSuccessMessage(`${methodName} processed successfully! All recipients will receive their ${methodName}.`);
        }

        // Reload payments to get updated status
        await loadPayments(batchInfo.batchId);
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      setError(error);
    } finally {
      // Always refresh payments to reflect latest statuses (including failures)
      if (batchInfo?.batchId) {
        await loadPayments(batchInfo.batchId);
      }
      setProcessing(false);
      setStreamProgress({ sent: 0, total: 0 });
    }
  };

  const getTotalAmount = () => {
    return displayData.reduce((sum, item) => {
      const originalAmount = parseFloat(item.amount) || 0;
      if (currentPaymentMethod === "giftogram") {
        return sum + getGiftogramAdjustedAmount(originalAmount);
      }
      return sum + originalAmount;
    }, 0);
  };

  const getTotalAmountLabel = () => {
    const total = getTotalAmount().toFixed(2);

    if (currentPaymentMethod === "giftogram" && currencyCode) {
      return `${total} ${currencyCode}`;
    }

    return `$${total}`;
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "failed":
        return "danger";
      default:
        return "default";
    }
  };

  // Helper function to calculate Giftogram adjusted amount (rounded to nearest $5)
  const getGiftogramAdjustedAmount = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return Math.round(numAmount / 5) * 5;
  };

  // Helper function to format amount display (supports Giftogram currency)
  const formatAmountForDisplay = (item) => {
    const originalAmount = parseFloat(item.amount) || 0;

    const formatWithCurrency = (value) => {
      const amountText = value.toFixed(2);
      if (currentPaymentMethod === "giftogram" && currencyCode) {
        return `${amountText} ${currencyCode}`;
      }
      return `$${amountText}`;
    };

    if (currentPaymentMethod === "giftogram") {
      const adjustedAmount = getGiftogramAdjustedAmount(originalAmount);
      if (adjustedAmount !== originalAmount) {
        return (
          <div className="space-y-1">
            <div className="line-through text-gray-400 text-sm">{formatWithCurrency(originalAmount)}</div>
            <div className="text-green-600 font-medium">{formatWithCurrency(adjustedAmount)}</div>
          </div>
        );
      }
    }

    return formatWithCurrency(originalAmount);
  };

  const handlePaymentMethodChange = (methodData) => {
    setCurrentPaymentMethod(methodData.paymentMethod);
    setBatchInfo(methodData.batch);

    if (methodData.currencyCode) {
      setCurrencyCode(methodData.currencyCode);
    } else if (Array.isArray(methodData.giftogramCurrencies) && methodData.giftogramCurrencies.length > 0) {
      setCurrencyCode(methodData.giftogramCurrencies[0]);
    }

    setSuccessMessage(`Payment method updated to ${getPaymentMethodName(methodData.paymentMethod)}`);
  };

  const getPaymentMethodName = (method) => {
    switch (method) {
      case "paypal":
        return "PayPal";
      case "giftogram":
        return "Gift Cards";
      case "bank_transfer":
        return "Bank Transfer";
      default:
        return method;
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "paypal":
        return <CreditCardIcon className="w-5 h-5" />;
      case "giftogram":
        return <GiftIcon className="w-5 h-5" />;
      case "bank_transfer":
        return <BanknotesIcon className="w-5 h-5" />;
      default:
        return <CreditCardIcon className="w-5 h-5" />;
    }
  };

  const getPaymentMethodDescription = () => {
    switch (currentPaymentMethod) {
      case "paypal":
        return "Review and edit payment details before processing with PayPal";
      case "giftogram":
        return "Review and configure gift card details before sending via Giftogram";
      case "bank_transfer":
        return "Review bank transfer details before processing";
      default:
        return "Review payment details before processing";
    }
  };

  return (
    <div className="space-y-6">
          <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getPageTitle()}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{getPaymentMethodDescription()}</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {getPaymentMethodIcon(currentPaymentMethod)}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {getPaymentMethodName(currentPaymentMethod)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {currentPaymentMethod === "giftogram" && (
        <Card className="p-0">
          <div className="p-6">
            <PaymentMethodSelector
              batch={batchInfo}
              mode="config-only"
              allowedMethod="giftogram"
              onMethodChange={handlePaymentMethodChange}
              onError={setError}
              onCurrencyChange={(info) => {
                if (!info) return;
                if (info.currencyCode) {
                  setCurrencyCode(info.currencyCode);
                } else if (Array.isArray(info.currencies) && info.currencies.length > 0) {
                  setCurrencyCode(info.currencies[0]);
                }
              }}
            />
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCardIcon className="w-8 h-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{displayData.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">payments to process</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCardIcon className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">{getTotalAmountLabel()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">total payout amount</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
              <p className="text-2xl font-bold text-blue-600">
                {processing && currentPaymentMethod === "giftogram" && streamProgress.total > 0
                  ? `Processing (${streamProgress.sent}/${streamProgress.total})`
                  : processing
                  ? "Processing..."
                  : "Ready"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {processing && currentPaymentMethod === "giftogram" && streamProgress.total > 0
                  ? "sending gift cards one by one"
                  : processing
                  ? "please wait"
                  : "ready to process"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={handleProcessPayments}
          onClose={() => setError(null)}
          title="Payment Processing Error"
        />
      )}

      {/* Success Message */}
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Action Button (top) */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="primary"
          size="lg"
          onClick={handleProcessPayments}
          loading={processing}
          icon={<PlayIcon className="w-5 h-5" />}
          className="flex-1 sm:flex-none"
        >
          {processing
            ? currentPaymentMethod === "giftogram" && streamProgress.total > 0
              ? `Sending Gift Cards (${streamProgress.sent}/${streamProgress.total})`
              : currentPaymentMethod === "giftogram"
              ? "Sending Gift Cards..."
              : "Processing Payments..."
            : currentPaymentMethod === "giftogram"
            ? "Send Gift Cards"
            : "Process All Payments"}
        </Button>
      </div>

        {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Name</Table.Head>
                <Table.Head>Email</Table.Head>
                <Table.Head>Amount</Table.Head>
                <Table.Head>Notes</Table.Head>
                <Table.Head>Status</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {paginatedData.map((row, index) => {
                const actualIndex = page * rowsPerPage + index;

                return (
                  <Table.Row key={actualIndex}>
                    <Table.Cell>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {row.recipientName || row.name || "-"}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="text-gray-600 dark:text-gray-400">
                        {row.recipientEmail || row.email || "-"}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatAmountForDisplay(row)}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="text-gray-600 dark:text-gray-400">{row.notes || "-"}</div>
                    </Table.Cell>
                    <Table.Cell>
                      {row.status && <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>}
                      {row.status === "failed" && row.errorMessage && (
                        <div className="mt-1 text-xs text-red-600 dark:text-red-400 max-w-xs">
                          {row.errorMessage}
                        </div>
                      )}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, displayData.length)} of{" "}
                  {displayData.length} results
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page === totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Payment Method Selection Modal removed in config-only flow */}
    </div>
  );
}

export default PaymentPreview;

