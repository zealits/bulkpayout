import React, { useState, useEffect } from "react";
import { processPaymentBatch, getPaymentsByBatch } from "../services/paymentService";
import { processGiftogramBatch } from "../services/giftogramService";
import { useEnvironment } from "../contexts/EnvironmentContext";
import {
  CreditCardIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  GiftIcon,
  BanknotesIcon,
  CogIcon,
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
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [processing, setProcessing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [batchInfo, setBatchInfo] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, index: null });
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState(defaultMethod || "paypal");

  // If data is from upload result, extract batch info
  useEffect(() => {
    if (data) {
      if (data.batch) {
        // Data from upload result
        setBatchInfo(data.batch);
        // In section-specific screens (e.g., Gift Cards), prefer the provided defaultMethod
        // so the header and actions match the selected section even if the batch has another method.
        setCurrentPaymentMethod(defaultMethod || data.batch.paymentMethod || "paypal");
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

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Preview</h1>
        <Alert variant="info">No data available. Please upload an Excel file first.</Alert>
      </div>
    );
  }

  const displayData = payments.length > 0 ? payments : Array.isArray(data) ? data : [];
  const totalPages = Math.ceil(displayData.length / rowsPerPage);
  const paginatedData = displayData.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleEdit = (row, index) => {
    setEditingRow(index);
    setEditData({ ...row });
  };

  const handleSave = () => {
    if (editingRow !== null) {
      // In a real implementation, you would update the data here
      setEditingRow(null);
      setEditData({});
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.index !== null) {
      // In a real implementation, you would delete the payment here
      setDeleteModal({ open: false, index: null });
    }
  };

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

    try {
      let response;

      if (currentPaymentMethod === "giftogram") {
        // Process with Giftogram
        response = await processGiftogramBatch(batchInfo.batchId, {
          campaignId: batchInfo.giftogramCampaignId,
          message: batchInfo.giftogramMessage || "Thank you for your hard work! Enjoy your gift card!",
          subject: batchInfo.giftogramSubject || "You have received a gift card!",
        });
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
      setProcessing(false);
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

  // Helper function to format amount display for Giftogram
  const formatAmountForDisplay = (item) => {
    const originalAmount = parseFloat(item.amount) || 0;

    if (currentPaymentMethod === "giftogram") {
      const adjustedAmount = getGiftogramAdjustedAmount(originalAmount);
      if (adjustedAmount !== originalAmount) {
        return (
          <div className="space-y-1">
            <div className="line-through text-gray-400 text-sm">${originalAmount.toFixed(2)}</div>
            <div className="text-green-600 font-medium">${adjustedAmount.toFixed(2)}</div>
          </div>
        );
      }
    }

    return `$${originalAmount.toFixed(2)}`;
  };

  const handlePaymentMethodChange = (methodData) => {
    setCurrentPaymentMethod(methodData.paymentMethod);
    setBatchInfo(methodData.batch);
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Preview</h1>
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
              <p className="text-2xl font-bold text-green-600">${getTotalAmount().toFixed(2)}</p>
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
              <p className="text-2xl font-bold text-blue-600">Ready</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">ready to process</p>
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

      {/* Action Buttons */}
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
            ? `Processing ${currentPaymentMethod === "giftogram" ? "Gift Cards" : "Payments"}...`
            : `Process All ${currentPaymentMethod === "giftogram" ? "Gift Cards" : "Payments"}`}
        </Button>

        <Button
          variant="outline"
          size="lg"
          icon={<DocumentDuplicateIcon className="w-5 h-5" />}
          className="flex-1 sm:flex-none"
        >
          Bulk Edit
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
                <Table.Head>Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {paginatedData.map((row, index) => {
                const actualIndex = page * rowsPerPage + index;
                const isEditing = editingRow === actualIndex;

                return (
                  <Table.Row key={actualIndex}>
                    <Table.Cell>
                      {isEditing ? (
                        <Input
                          value={editData.recipientName || editData.name || ""}
                          onChange={(e) =>
                            setEditData({ ...editData, recipientName: e.target.value, name: e.target.value })
                          }
                          className="min-w-[150px]"
                        />
                      ) : (
                        <div className="font-medium text-gray-900 dark:text-white">
                          {row.recipientName || row.name || "-"}
                        </div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={editData.recipientEmail || editData.email || ""}
                          onChange={(e) =>
                            setEditData({ ...editData, recipientEmail: e.target.value, email: e.target.value })
                          }
                          className="min-w-[200px]"
                        />
                      ) : (
                        <div className="text-gray-600 dark:text-gray-400">{row.recipientEmail || row.email || "-"}</div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.amount || ""}
                          onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                          className="min-w-[120px]"
                        />
                      ) : (
                        <div className="font-semibold text-gray-900 dark:text-white">{formatAmountForDisplay(row)}</div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {isEditing ? (
                        <Input
                          value={editData.notes || ""}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          className="min-w-[150px]"
                        />
                      ) : (
                        <div className="text-gray-600 dark:text-gray-400">{row.notes || "-"}</div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {row.status && <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>}
                    </Table.Cell>
                    <Table.Cell>
                      {isEditing ? (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={handleSave}
                            icon={<CheckIcon className="w-4 h-4" />}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleCancel}
                            icon={<XMarkIcon className="w-4 h-4" />}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(row, actualIndex)}
                            icon={<PencilIcon className="w-4 h-4" />}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteModal({ open: true, index: actualIndex })}
                            icon={<TrashIcon className="w-4 h-4" />}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Delete
                          </Button>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, index: null })}
        title="Confirm Delete"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, index: null })}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-gray-600 dark:text-gray-400">
          Are you sure you want to delete this payment? This action cannot be undone.
        </p>
      </Modal>

      {/* Payment Method Selection Modal removed in config-only flow */}
    </div>
  );
}

export default PaymentPreview;

