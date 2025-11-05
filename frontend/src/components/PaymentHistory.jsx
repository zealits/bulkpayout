import React, { useState, useEffect } from "react";
import { getPaymentBatches, getPaymentStats, syncWithPayPal, getPaymentBatch } from "../services/paymentService";
import { syncGiftogramBatch } from "../services/giftogramService";
import { useEnvironment } from "../contexts/EnvironmentContext";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ReceiptPercentIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Alert from "./ui/Alert";
import Table from "./ui/Table";
import Input from "./ui/Input";
import Badge from "./ui/Badge";
import Modal from "./ui/Modal";
import { LoadingOverlay, Spinner } from "./ui/Loading";

function PaymentHistory({ method = "paypal" }) {
  const { environment } = useEnvironment();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentBatches, setPaymentBatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Reset page when payment method changes
  useEffect(() => {
    setPage(0);
    setSearchTerm("");
    setStatusFilter("all");
  }, [method]);

  useEffect(() => {
    loadPaymentHistory();
    loadStats();
  }, [page, rowsPerPage, statusFilter, dateFilter, environment, method]);

  const loadPaymentHistory = async () => {
    setLoading(true);
    try {
      const response = await getPaymentBatches(page + 1, rowsPerPage);
      if (response.success) {
        setPaymentBatches(response.data);
      }
    } catch (error) {
      console.error("Error loading payment history:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getPaymentStats(null, dateFilter === "all" ? null : dateFilter, method);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleRefresh = () => {
    loadPaymentHistory();
    loadStats();
  };

  const handleSyncWithPayPal = async (batchId) => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const response = await syncWithPayPal(batchId);
      if (response.success) {
        setSyncMessage({
          type: "success",
          text: `Successfully synced with PayPal. Status: ${response.data.batch.paypalBatchStatus || "Updated"}`,
        });
        loadPaymentHistory();
        // Reload batch details if modal is open
        if (selectedBatch && selectedBatch.batchId === batchId) {
          const detailsResponse = await getPaymentBatch(batchId);
          if (detailsResponse.success) {
            setBatchDetails(detailsResponse.data);
          }
        }
      } else {
        setSyncMessage({
          type: "error",
          text: "Failed to sync with PayPal. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error syncing with PayPal:", error);
      setSyncMessage({
        type: "error",
        text: `Error syncing with PayPal: ${error.message}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncWithGiftogram = async (batchId) => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const response = await syncGiftogramBatch(batchId);
      if (response.success) {
        setSyncMessage({
          type: "success",
          text: `Successfully synced with Giftogram. Updated ${response.data.syncDetails?.paymentsUpdated || 0} payments.`,
        });
        loadPaymentHistory();
        // Reload batch details if modal is open
        if (selectedBatch && selectedBatch.batchId === batchId) {
          const detailsResponse = await getPaymentBatch(batchId);
          if (detailsResponse.success) {
            setBatchDetails(detailsResponse.data);
          }
        }
      } else {
        setSyncMessage({
          type: "error",
          text: "Failed to sync with Giftogram. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error syncing with Giftogram:", error);
      setSyncMessage({
        type: "error",
        text: `Error syncing with Giftogram: ${error.message}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleViewDetails = async (batch) => {
    setSelectedBatch(batch);
    setDetailsOpen(true);
    try {
      const response = await getPaymentBatch(batch.batchId);
      if (response.success) {
        setBatchDetails(response.data);
      }
    } catch (error) {
      console.error("Error loading batch details:", error);
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedBatch(null);
    setBatchDetails(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredData = paymentBatches.filter((batch) => {
    if (method && batch.paymentMethod && batch.paymentMethod !== method) return false;
    const matchesSearch =
      batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.batchId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || batch.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getTotalAmount = () => {
    return stats?.batchStats?.totalAmount || 0;
  };

  const getStatusCounts = () => {
    const counts = { completed: 0, pending: 0, failed: 0 };
    filteredData.forEach((batch) => {
      if (batch.status === "completed") counts.completed++;
      else if (batch.status === "processing" || batch.status === "uploaded") counts.pending++;
      else counts.failed++;
    });
    return counts;
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
      case "processing":
      case "uploaded":
        return "warning";
      case "failed":
        return "danger";
      default:
        return "default";
    }
  };

  const getPayPalStatusVariant = (status) => {
    switch (status) {
      case "SUCCESS":
        return "success";
      case "PENDING":
        return "warning";
      default:
        return "default";
    }
  };

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white"></h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View and track all processed payments and their current status
        </p>
      </div>

      {/* Sync Message Alert */}
      {syncMessage && (
        <Alert variant={syncMessage.type} onClose={() => setSyncMessage(null)}>
          {syncMessage.text}
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCardIcon className="w-8 h-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredData.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">total payments</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ReceiptPercentIcon className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">${getTotalAmount().toFixed(2)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">total processed</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600">{getStatusCounts().completed}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">successful payments</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending/Failed</p>
              <p className="text-2xl font-bold text-yellow-600">
                {getStatusCounts().pending + getStatusCounts().failed}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">requires attention</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
          />

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" icon={<ArrowDownTrayIcon className="w-4 h-4" />} className="flex-1">
              Export
            </Button>
            <Button variant="outline" onClick={handleRefresh} icon={<ArrowPathIcon className="w-4 h-4" />}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Payment History Table */}
      <LoadingOverlay isLoading={loading}>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <Table className="min-w-full">
              <Table.Header>
                <Table.Row>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Batch ID</Table.Head>
                  {method === "paypal" && <Table.Head>PayPal Status</Table.Head>}
                  <Table.Head>Total Amount</Table.Head>
                  <Table.Head>Payments</Table.Head>
                  <Table.Head>Upload Date</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {paginatedData.map((batch) => (
                  <Table.Row key={batch.batchId}>
                    <Table.Cell>
                      <Badge variant={getStatusVariant(batch.status)}>{batch.status}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{batch.batchId}</code>
                    </Table.Cell>
                    {method === "paypal" && (
                      <Table.Cell>
                        {batch.paypalBatchStatus ? (
                          <Badge variant={getPayPalStatusVariant(batch.paypalBatchStatus)}>
                            {batch.paypalBatchStatus}
                          </Badge>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 text-sm">Not synced</span>
                        )}
                      </Table.Cell>
                    )}
                    <Table.Cell>
                      <div className="font-semibold text-gray-900 dark:text-white">${batch.totalAmount.toFixed(2)}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="text-gray-600 dark:text-gray-400">{batch.totalPayments} payments</div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">{formatDate(batch.uploadedAt)}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex space-x-2">
                        {method === "paypal" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSyncWithPayPal(batch.batchId)}
                            disabled={syncing || !batch.paypalPayoutBatchId}
                            icon={syncing ? <Spinner size="sm" /> : <ArrowsUpDownIcon className="w-4 h-4" />}
                          >
                            Sync
                          </Button>
                        )}
                        {method === "giftogram" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSyncWithGiftogram(batch.batchId)}
                            disabled={syncing}
                            icon={syncing ? <Spinner size="sm" /> : <ArrowsUpDownIcon className="w-4 h-4" />}
                          >
                            Sync
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(batch)}
                          icon={<EyeIcon className="w-4 h-4" />}
                        >
                          View
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredData.length)} of{" "}
                    {filteredData.length} results
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

        {filteredData.length === 0 && !loading && (
          <Card className="p-8 text-center">
            <ReceiptPercentIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payments found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria or filters</p>
          </Card>
        )}
      </LoadingOverlay>

      {/* Batch Details Modal */}
      <Modal
        isOpen={detailsOpen}
        onClose={handleCloseDetails}
        title={`Batch Details: ${selectedBatch?.name}`}
        size="6xl"
      >
        {batchDetails ? (
          <div className="space-y-6">
            {/* Batch Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Batch Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Batch ID:</span>
                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {batchDetails.batch.batchId}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <Badge variant={getStatusVariant(batchDetails.batch.status)}>{batchDetails.batch.status}</Badge>
                  </div>
                  {batchDetails.batch.paymentMethod === "paypal" && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">PayPal Batch ID:</span>
                      <span className="text-gray-900 dark:text-white">
                        {batchDetails.batch.paypalPayoutBatchId || "N/A"}
                      </span>
                    </div>
                  )}
                  {batchDetails.batch.paymentMethod === "giftogram" && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Giftogram Campaign ID:</span>
                      <span className="text-gray-900 dark:text-white">
                        {batchDetails.batch.giftogramCampaignId || "N/A"}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total Amount:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${batchDetails.batch.totalAmount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Status Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Completed:</span>
                    <Badge variant="success">{batchDetails.batch.completedPayments || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Processing:</span>
                    <Badge variant="warning">{batchDetails.batch.processingPayments || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Failed:</span>
                    <Badge variant="danger">{batchDetails.batch.failedPayments || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Pending:</span>
                    <Badge variant="warning">{batchDetails.batch.pendingPayments || 0}</Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Individual Payments */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Individual Payments</h3>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Recipient</Table.Head>
                      <Table.Head>Email</Table.Head>
                      <Table.Head>Amount</Table.Head>
                      <Table.Head>Status</Table.Head>
                        {batchDetails.batch.paymentMethod === "paypal" && <Table.Head>PayPal Status</Table.Head>}
                        {batchDetails.batch.paymentMethod === "giftogram" && <Table.Head>Order ID</Table.Head>}
                        <Table.Head>Transaction ID</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {batchDetails.payments?.map((payment, index) => (
                      <Table.Row key={payment._id || index}>
                        <Table.Cell>{payment.recipientName}</Table.Cell>
                        <Table.Cell>{payment.recipientEmail}</Table.Cell>
                        <Table.Cell>${payment.amount?.toFixed(2)}</Table.Cell>
                        <Table.Cell>
                          <Badge variant={getStatusVariant(payment.status)}>{payment.status}</Badge>
                        </Table.Cell>
                        {batchDetails.batch.paymentMethod === "paypal" && (
                          <Table.Cell>
                            {payment.paypalTransactionStatus ? (
                              <Badge variant={getPayPalStatusVariant(payment.paypalTransactionStatus)}>
                                {payment.paypalTransactionStatus}
                              </Badge>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400 text-sm">N/A</span>
                            )}
                          </Table.Cell>
                        )}
                        {batchDetails.batch.paymentMethod === "giftogram" && (
                          <Table.Cell>
                            <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {payment.giftogramOrderId || "N/A"}
                            </code>
                          </Table.Cell>
                        )}
                        <Table.Cell>
                          <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {payment.transactionId || payment.giftogramOrderId || "N/A"}
                          </code>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </div>

            {/* Sync Button in Modal - Show for PayPal and Giftogram batches */}
            {batchDetails.batch.paymentMethod === "paypal" && (
              <div className="flex justify-center">
                <Button
                  variant="primary"
                  icon={syncing ? <Spinner size="sm" /> : <ArrowsUpDownIcon className="w-5 h-5" />}
                  onClick={() => handleSyncWithPayPal(selectedBatch?.batchId)}
                  disabled={syncing || !selectedBatch?.paypalPayoutBatchId}
                  loading={syncing}
                >
                  Sync with PayPal
                </Button>
              </div>
            )}
            {batchDetails.batch.paymentMethod === "giftogram" && (
              <div className="flex justify-center">
                <Button
                  variant="primary"
                  icon={syncing ? <Spinner size="sm" /> : <ArrowsUpDownIcon className="w-5 h-5" />}
                  onClick={() => handleSyncWithGiftogram(selectedBatch?.batchId)}
                  disabled={syncing}
                  loading={syncing}
                >
                  Sync with Giftogram
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center p-8">
            <Spinner size="lg" />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PaymentHistory;
