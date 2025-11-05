import React, { useEffect, useState } from "react";
import {
  getXeRecipients,
  deleteXeRecipient,
  createXeContract,
  approveXeContract,
  cancelXeContract,
} from "../services/xeService";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { ArrowPathIcon, MagnifyingGlassIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

// Bulk Contracts Table Component
function BulkContractsTable({ contracts, onApproveSelected, bulkApproving }) {
  const [selectedContracts, setSelectedContracts] = useState(new Set());
  const [contractTimers, setContractTimers] = useState({});

  useEffect(() => {
    const intervals = {};
    contracts.forEach((contract) => {
      const contractNumber = contract.identifier?.contractNumber;
      if (!contractNumber) return;

      const calculateTimeLeft = () => {
        if (!contract.quote?.expires) return 0;
        try {
          const expires =
            contract.quote.expires instanceof Date ? contract.quote.expires : new Date(contract.quote.expires);
          const now = new Date();
          return Math.max(0, Math.floor((expires - now) / 1000));
        } catch {
          return 0;
        }
      };

      setContractTimers((prev) => ({ ...prev, [contractNumber]: calculateTimeLeft() }));
      intervals[contractNumber] = setInterval(() => {
        setContractTimers((prev) => ({ ...prev, [contractNumber]: calculateTimeLeft() }));
      }, 1000);
    });

    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, [contracts]);

  const handleSelectContract = (contractNumber) => {
    const newSelected = new Set(selectedContracts);
    if (newSelected.has(contractNumber)) {
      newSelected.delete(contractNumber);
    } else {
      newSelected.add(contractNumber);
    }
    setSelectedContracts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedContracts.size === contracts.length) {
      setSelectedContracts(new Set());
    } else {
      const availableContracts = contracts
        .filter((c) => {
          const expires = c.quote?.expires ? new Date(c.quote.expires) : null;
          const now = new Date();
          const isExpired = expires && expires < now;
          const isApproved = c.status === "Approved" || c.status === "ContractConfirmed";
          return !isExpired && !isApproved && c.identifier?.contractNumber;
        })
        .map((c) => c.identifier.contractNumber);
      setSelectedContracts(new Set(availableContracts));
    }
  };

  const handleApproveSelected = () => {
    onApproveSelected(Array.from(selectedContracts));
    setSelectedContracts(new Set());
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return "Expired";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="overflow-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-6 py-3 text-left w-12">
              <input
                type="checkbox"
                checked={
                  selectedContracts.size ===
                    contracts.filter((c) => {
                      const expires = c.quote?.expires ? new Date(c.quote.expires) : null;
                      const now = new Date();
                      const isExpired = expires && expires < now;
                      const isApproved = c.status === "Approved" || c.status === "ContractConfirmed";
                      return !isExpired && !isApproved && c.identifier?.contractNumber;
                    }).length && contracts.length > 0
                }
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Contract
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Recipient
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Rate
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Time Left
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {contracts.map((contract) => {
            const fxDetail = contract.quote?.fxDetails?.[0];
            const sellAmount = fxDetail?.sell?.amount || contract.paymentRequest?.sellAmount?.amount || 0;
            const sellCurrency = fxDetail?.sell?.currency || "USD";
            const buyCurrency = fxDetail?.buy?.currency || contract.paymentRequest?.buyAmount?.currency || "";
            const rate = fxDetail?.rate?.rate || 0;
            const convertedAmount = rate > 0 && sellAmount > 0 ? sellAmount * rate : fxDetail?.buy?.amount || 0;
            const contractNumber = contract.identifier?.contractNumber;
            const secondsLeft = contractTimers[contractNumber] || 0;
            const isExpired = secondsLeft <= 0;
            const isApproved = contract.status === "Approved" || contract.status === "ContractConfirmed";
            const canApprove = !isExpired && !isApproved;

            return (
              <tr key={contractNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedContracts.has(contractNumber)}
                    onChange={() => handleSelectContract(contractNumber)}
                    disabled={!canApprove}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-mono text-gray-900 dark:text-gray-100">{contractNumber || "-"}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {contract.recipient?.entity?.company?.name ||
                      [
                        contract.recipient?.entity?.consumer?.givenNames,
                        contract.recipient?.entity?.consumer?.familyName,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                      "-"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {sellAmount.toFixed(2)} {sellCurrency}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      = {convertedAmount.toFixed(2)} {buyCurrency}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {rate > 0 ? `1 ${sellCurrency} = ${rate.toFixed(4)} ${buyCurrency}` : "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-sm font-mono font-semibold ${
                      isExpired
                        ? "text-red-600 dark:text-red-400"
                        : secondsLeft < 60
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {formatTime(secondsLeft)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      isApproved
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : isExpired
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {contract.status || "Unknown"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onApproveSelected([contractNumber])}
                    disabled={!canApprove || bulkApproving}
                    loading={bulkApproving}
                  >
                    Approve
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {selectedContracts.size > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedContracts.size} contract(s) selected
          </span>
          <Button variant="primary" onClick={handleApproveSelected} loading={bulkApproving} disabled={bulkApproving}>
            Approve Selected
          </Button>
        </div>
      )}
    </div>
  );
}

// Contract Details View Component
function ContractDetailsView({ contract, secondsLeft, error, approvingContract }) {
  // Debug: Log contract structure
  useEffect(() => {
    console.log("ContractDetailsView - Contract data:", contract);
    console.log("ContractDetailsView - Quote:", contract?.quote);
    console.log("ContractDetailsView - fxDetails:", contract?.quote?.fxDetails);
  }, [contract]);

  // Extract conversion data from fxDetails
  const fxDetail = contract?.quote?.fxDetails?.[0];
  const rate = fxDetail?.rate?.rate || 0;
  const sellCurrency = fxDetail?.sell?.currency || contract?.paymentRequest?.sellAmount?.currency || "USD";
  const sellAmount = fxDetail?.sell?.amount || contract?.paymentRequest?.sellAmount?.amount || 0;
  const buyCurrency = fxDetail?.buy?.currency || contract?.paymentRequest?.buyAmount?.currency || "";
  // Calculate converted amount: sellAmount * rate
  const convertedAmount = rate > 0 && sellAmount > 0 ? sellAmount * rate : fxDetail?.buy?.amount || 0;
  const inverseRate = fxDetail?.rate?.inverseRate || 0;

  // Show message if contract data is missing
  if (!contract) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">No contract data available.</p>
      </div>
    );
  }

  // Format time remaining
  const formatTime = (seconds) => {
    if (seconds <= 0) return "Expired";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const isExpired = secondsLeft <= 0;

  return (
    <div className="space-y-4">
      {/* Contract Information */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Contract Number:</span>
          <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
            {contract?.identifier?.contractNumber || "-"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
          <span className="text-sm font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            {contract?.status || "Unknown"}
          </span>
        </div>
      </div>

      {/* Conversion Details */}
      {fxDetail ? (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-6 space-y-4 border border-blue-200 dark:border-blue-700">
          <div className="text-center space-y-3">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 font-medium">
                You Are Selling
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {sellAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                <span className="text-xl">{sellCurrency}</span>
              </div>
            </div>

            <div className="flex items-center justify-center my-2">
              <div className="flex-grow border-t border-blue-300 dark:border-blue-600"></div>
              <div className="px-3 text-blue-600 dark:text-blue-400 text-xl">↓</div>
              <div className="flex-grow border-t border-blue-300 dark:border-blue-600"></div>
            </div>

            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 font-medium">
                Recipient Will Receive
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                <span className="text-xl">{buyCurrency}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-blue-200 dark:border-blue-700 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exchange Rate:</span>
              <span className="text-base font-semibold text-blue-700 dark:text-blue-300">
                1 {sellCurrency} = {rate > 0 ? rate.toFixed(4) : "N/A"} {buyCurrency}
              </span>
            </div>
            {inverseRate > 0 && (
              <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                <span>Inverse Rate:</span>
                <span className="font-medium">
                  1 {buyCurrency} = {inverseRate.toFixed(4)} {sellCurrency}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Conversion details are loading. Quote data: {contract?.quote ? "Available" : "Missing"}
          </p>
          {contract?.paymentRequest && (
            <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
              Requested: {contract.paymentRequest.sellAmount?.amount} {contract.paymentRequest.sellAmount?.currency} →{" "}
              {contract.paymentRequest.buyAmount?.currency}
            </div>
          )}
        </div>
      )}

      {/* Countdown Timer */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Remaining:</span>
          <span
            className={`text-2xl font-mono font-bold ${
              isExpired
                ? "text-red-600 dark:text-red-400"
                : secondsLeft < 60
                ? "text-orange-600 dark:text-orange-400"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {formatTime(secondsLeft)}
          </span>
        </div>
        {isExpired && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            This quote has expired. Please create a new contract.
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

export default function XeRecipients() {
  const { environment } = useEnvironment();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, recipient: null });
  const [amountModal, setAmountModal] = useState({ open: false, recipient: null, contract: null });
  const [contractAmount, setContractAmount] = useState("");
  const [creatingContract, setCreatingContract] = useState(false);
  const [approvingContract, setApprovingContract] = useState(false);
  const [cancellingContract, setCancellingContract] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [selectedRecipients, setSelectedRecipients] = useState(new Set());
  const [bulkContracts, setBulkContracts] = useState([]);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [showBulkContracts, setShowBulkContracts] = useState(false);
  const [bulkAmountModal, setBulkAmountModal] = useState({ open: false, amount: "" });

  // Generate a consistent pastel color per batchId
  const colorForBatch = (batchId) => {
    if (!batchId) return { bg: "bg-gray-100", text: "text-gray-700", ring: "ring-gray-200" };
    // Simple hash to hue
    let hash = 0;
    for (let i = 0; i < batchId.length; i++) hash = (hash * 31 + batchId.charCodeAt(i)) >>> 0;
    const hue = hash % 360;
    // Use HSL via inline style when needed; here map to a set of utility classes for simplicity
    const hues = [
      { bg: "bg-red-100", text: "text-red-800", ring: "ring-red-200" },
      { bg: "bg-yellow-100", text: "text-yellow-800", ring: "ring-yellow-200" },
      { bg: "bg-green-100", text: "text-green-800", ring: "ring-green-200" },
      { bg: "bg-cyan-100", text: "text-cyan-800", ring: "ring-cyan-200" },
      { bg: "bg-blue-100", text: "text-blue-800", ring: "ring-blue-200" },
      { bg: "bg-indigo-100", text: "text-indigo-800", ring: "ring-indigo-200" },
      { bg: "bg-purple-100", text: "text-purple-800", ring: "ring-purple-200" },
      { bg: "bg-pink-100", text: "text-pink-800", ring: "ring-pink-200" },
      { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-200" },
      { bg: "bg-lime-100", text: "text-lime-800", ring: "ring-lime-200" },
    ];
    return hues[hash % hues.length];
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getXeRecipients({ page, limit, search: search || undefined });
      setItems(response?.data?.items || []);
      setTotalPages(response?.data?.totalPages || 1);
    } catch (e) {
      setError(e.message || "Failed to load recipients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, environment]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleDeleteClick = (recipient) => {
    setDeleteModal({ open: true, recipient });
  };

  const handleDeleteConfirm = async () => {
    const recipient = deleteModal.recipient;
    if (!recipient?.recipientId?.xeRecipientId) return;

    try {
      setDeletingId(recipient.recipientId.xeRecipientId);
      await deleteXeRecipient(recipient.recipientId.xeRecipientId);
      setDeleteModal({ open: false, recipient: null });
      await fetchData();
    } catch (e) {
      setError(e.message || "Failed to delete recipient");
    } finally {
      setDeletingId("");
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ open: false, recipient: null });
  };

  const handleCreateContractClick = (recipient) => {
    setAmountModal({ open: true, recipient, contract: null });
    setContractAmount("");
    setSecondsLeft(0);
    setError("");
  };

  const handleAmountCancel = () => {
    setAmountModal({ open: false, recipient: null, contract: null });
    setContractAmount("");
    setSecondsLeft(0);
    setError("");
  };

  const handleCreateContract = async () => {
    const recipient = amountModal.recipient;
    if (!recipient?.recipientId?.xeRecipientId || !contractAmount || parseFloat(contractAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setCreatingContract(true);
    setError("");

    try {
      const response = await createXeContract({
        xeRecipientId: recipient.recipientId.xeRecipientId,
        amount: parseFloat(contractAmount),
        buyCurrency: recipient.currency || "INR",
      });

      // Response is already unwrapped by API interceptor: { success, message, data }
      console.log("Full API response:", response);
      const contract = response?.data;
      console.log("Extracted contract:", contract);

      if (contract) {
        console.log("Contract created successfully:", {
          contractNumber: contract?.identifier?.contractNumber,
          hasQuote: !!contract?.quote,
          hasFxDetails: !!contract?.quote?.fxDetails,
          fxDetailsLength: contract?.quote?.fxDetails?.length,
        });
        // Keep modal open but show contract details
        setAmountModal({ ...amountModal, contract });
        setContractAmount("");
        setError(""); // Clear any previous errors
      } else {
        console.error("No contract data in response:", response);
        setError("Failed to create contract: No contract data received");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create contract");
    } finally {
      setCreatingContract(false);
    }
  };

  // Countdown timer for contract expiration
  useEffect(() => {
    if (!amountModal.contract || !amountModal.contract.quote?.expires) {
      setSecondsLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      try {
        const expires =
          amountModal.contract.quote.expires instanceof Date
            ? amountModal.contract.quote.expires
            : new Date(amountModal.contract.quote.expires);
        const now = new Date();
        const diff = Math.max(0, Math.floor((expires - now) / 1000));
        setSecondsLeft(diff);
      } catch (error) {
        console.error("Error calculating time left:", error);
        setSecondsLeft(0);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [amountModal.contract]);

  const handleApproveContract = async () => {
    const contract = amountModal.contract;
    if (!contract?.identifier?.contractNumber) return;

    setApprovingContract(true);
    setError("");

    try {
      await approveXeContract(contract.identifier.contractNumber);
      // Close modal and refresh
      handleAmountCancel();
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to approve contract");
    } finally {
      setApprovingContract(false);
    }
  };

  const handleCancelContract = async () => {
    const contract = amountModal.contract;
    if (!contract?.identifier?.contractNumber) return;

    setCancellingContract(true);
    setError("");

    try {
      await cancelXeContract(contract.identifier.contractNumber);
      // Close modal and refresh
      handleAmountCancel();
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to cancel contract");
    } finally {
      setCancellingContract(false);
    }
  };

  // Bulk contract creation handlers
  const handleSelectRecipient = (recipientId) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(recipientId)) {
      newSelected.delete(recipientId);
    } else {
      newSelected.add(recipientId);
    }
    setSelectedRecipients(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRecipients.size === items.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(items.filter((r) => r?.recipientId?.xeRecipientId).map((r) => r._id)));
    }
  };

  const handleBulkCreateContracts = () => {
    if (selectedRecipients.size === 0) {
      setError("Please select at least one recipient");
      return;
    }

    // Get selected recipient details
    const recipientsToProcess = items.filter((r) => selectedRecipients.has(r._id));

    // Open modal for bulk amount input
    setBulkAmountModal({ open: true, amount: "", recipientCount: recipientsToProcess.length });
    setError("");
  };

  const handleConfirmBulkAmount = async () => {
    if (!bulkAmountModal.amount || parseFloat(bulkAmountModal.amount) <= 0) {
      setError("Invalid amount. Please enter a valid USD amount.");
      return;
    }

    const amount = parseFloat(bulkAmountModal.amount);
    setBulkCreating(true);
    setError("");
    setBulkAmountModal({ open: false, amount: "" });
    const contracts = [];
    const errors = [];

    // Get selected recipient details
    const recipientsToProcess = items.filter((r) => selectedRecipients.has(r._id));

    // Create contracts for all selected recipients
    for (const recipient of recipientsToProcess) {
      if (!recipient?.recipientId?.xeRecipientId) continue;

      try {
        const response = await createXeContract({
          xeRecipientId: recipient.recipientId.xeRecipientId,
          amount: amount,
          buyCurrency: recipient.currency || "INR",
        });

        const contract = response?.data;
        if (contract) {
          contracts.push({
            ...contract,
            recipient: recipient,
            recipientId: recipient._id,
          });
        } else {
          errors.push({
            recipient: recipient,
            error: "No contract data received",
          });
        }
      } catch (err) {
        errors.push({
          recipient: recipient,
          error: err.response?.data?.message || err.message || "Failed to create contract",
        });
      }
    }

    setBulkContracts(contracts);
    setShowBulkContracts(true);
    setSelectedRecipients(new Set());
    setBulkCreating(false);

    if (errors.length > 0) {
      setError(`${errors.length} contract(s) failed to create. ${contracts.length} contract(s) created successfully.`);
    } else {
      setError("");
    }
  };

  const handleApproveSelected = async (contractNumbers) => {
    if (contractNumbers.length === 0) {
      setError("Please select at least one contract to approve");
      return;
    }

    setBulkApproving(true);
    setError("");
    const results = { success: [], failed: [] };

    for (const contractNumber of contractNumbers) {
      try {
        await approveXeContract(contractNumber);
        results.success.push(contractNumber);
      } catch (err) {
        results.failed.push({
          contractNumber,
          error: err.response?.data?.message || err.message || "Failed to approve",
        });
      }
    }

    // Update contracts status
    setBulkContracts((prev) =>
      prev.map((c) => {
        if (results.success.includes(c.identifier?.contractNumber)) {
          return { ...c, status: "Approved", approvedAt: new Date() };
        }
        return c;
      })
    );

    setBulkApproving(false);

    if (results.failed.length > 0) {
      setError(
        `${results.failed.length} contract(s) failed to approve. ${results.success.length} approved successfully.`
      );
    } else {
      setError("");
      // Refresh data after successful approval
      await fetchData();
    }
  };

  const handleApproveAll = async () => {
    const contractNumbers = bulkContracts
      .filter((c) => {
        const expires = c.quote?.expires ? new Date(c.quote.expires) : null;
        const now = new Date();
        const isExpired = expires && expires < now;
        const isApproved = c.status === "Approved" || c.status === "ContractConfirmed";
        return !isExpired && !isApproved && c.identifier?.contractNumber;
      })
      .map((c) => c.identifier.contractNumber);

    if (contractNumbers.length === 0) {
      setError("No contracts available for approval");
      return;
    }

    await handleApproveSelected(contractNumbers);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">XE Recipients</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and create contracts for your XE recipients
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Search Bar and Bulk Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="Search by name, recipient ID, or account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>
        {selectedRecipients.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{selectedRecipients.size} selected</span>
            <Button
              variant="primary"
              onClick={handleBulkCreateContracts}
              loading={bulkCreating}
              disabled={bulkCreating}
            >
              Create Bulk Contracts
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectedRecipients.size === items.length && items.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Batch
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Currency
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Bank Account
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No recipients found</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search criteria</p>
                  </div>
                </td>
              </tr>
            )}
            {items.map((r) => (
              <tr
                key={r._id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 ${
                  selectedRecipients.has(r._id) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedRecipients.has(r._id)}
                    onChange={() => handleSelectRecipient(r._id)}
                    disabled={!r?.recipientId?.xeRecipientId}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    const c = colorForBatch(r?.batchId);
                    return (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${c.bg} ${c.text} ${c.ring}`}
                      >
                        {r?.batchId || "-"}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {r?.entity?.company?.name ||
                      [r?.entity?.consumer?.givenNames, r?.entity?.consumer?.familyName].filter(Boolean).join(" ") ||
                      "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {r.currency || "-"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div
                    className="text-sm text-gray-900 dark:text-gray-100 max-w-[200px] truncate"
                    title={r?.payoutMethod?.bank?.account?.accountName}
                  >
                    {r?.payoutMethod?.bank?.account?.accountName || "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!r?.recipientId?.xeRecipientId}
                      onClick={() => handleCreateContractClick(r)}
                      className="text-xs"
                    >
                      Create Contract
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={!r?.recipientId?.xeRecipientId || deletingId === r?.recipientId?.xeRecipientId}
                      loading={deletingId === r?.recipientId?.xeRecipientId}
                      onClick={() => handleDeleteClick(r)}
                      className="text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">Page</span>
            <span className="mx-2 font-semibold text-gray-900 dark:text-gray-100">{page}</span>
            <span className="text-gray-500 dark:text-gray-400">of</span>
            <span className="mx-2 font-semibold text-gray-900 dark:text-gray-100">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Loading and Error States */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            Loading recipients...
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {bulkCreating && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-600 dark:text-blue-400">Creating contracts in bulk... Please wait.</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={handleDeleteCancel}
        title="Delete Recipient"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleDeleteCancel} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={!!deletingId} disabled={!!deletingId}>
              Delete
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Are you sure you want to delete this recipient? This will remove the recipient from both the XE database
              and your local database. This action cannot be undone.
            </p>
            {deleteModal.recipient && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Client Ref:</span>{" "}
                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                    {deleteModal.recipient?.recipientId?.clientReference || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Recipient ID:</span>{" "}
                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                    {deleteModal.recipient?.recipientId?.xeRecipientId || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>{" "}
                  <span className="text-gray-600 dark:text-gray-400">
                    {deleteModal.recipient?.entity?.company?.name ||
                      [
                        deleteModal.recipient?.entity?.consumer?.givenNames,
                        deleteModal.recipient?.entity?.consumer?.familyName,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                      "-"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Bulk Amount Input Modal */}
      <Modal
        isOpen={bulkAmountModal.open}
        onClose={() => setBulkAmountModal({ open: false, amount: "" })}
        title="Bulk Contract Creation"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setBulkAmountModal({ open: false, amount: "" })}
              disabled={bulkCreating}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmBulkAmount} loading={bulkCreating} disabled={bulkCreating}>
              Create Contracts
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              You are about to create contracts for <strong>{bulkAmountModal.recipientCount || 0}</strong> recipient(s).
              All recipients will receive the same USD amount.
            </p>
          </div>
          <div>
            <label htmlFor="bulkAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount (USD) to Sell per Recipient
            </label>
            <input
              id="bulkAmount"
              type="number"
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              placeholder="Enter amount in USD"
              value={bulkAmountModal.amount}
              onChange={(e) => setBulkAmountModal({ ...bulkAmountModal, amount: e.target.value })}
              disabled={bulkCreating}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Each recipient will receive the equivalent in their currency based on the current exchange rate.
            </p>
          </div>
        </div>
      </Modal>

      {/* Bulk Contracts View Modal */}
      {showBulkContracts && bulkContracts.length > 0 && (
        <Modal
          isOpen={showBulkContracts}
          onClose={() => setShowBulkContracts(false)}
          title={`Bulk Contracts (${bulkContracts.length})`}
          size="xl"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowBulkContracts(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={handleApproveAll} loading={bulkApproving} disabled={bulkApproving}>
                Approve All
              </Button>
            </div>
          }
        >
          <div className="overflow-auto">
            <BulkContractsTable
              contracts={bulkContracts}
              onApproveSelected={handleApproveSelected}
              bulkApproving={bulkApproving}
            />
          </div>
        </Modal>
      )}

      {/* Create Contract / Contract Details Modal */}
      <Modal
        isOpen={amountModal.open}
        onClose={handleAmountCancel}
        title={amountModal.contract ? "Contract Details" : "Create Contract"}
        size="lg"
        footer={
          amountModal.contract ? (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleCancelContract}
                disabled={approvingContract || cancellingContract}
                loading={cancellingContract}
              >
                Cancel Contract
              </Button>
              <Button
                variant="primary"
                onClick={handleApproveContract}
                loading={approvingContract}
                disabled={approvingContract || cancellingContract || secondsLeft <= 0}
              >
                Approve Contract
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleAmountCancel} disabled={creatingContract}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateContract}
                loading={creatingContract}
                disabled={creatingContract}
              >
                Create Contract
              </Button>
            </div>
          )
        }
      >
        {amountModal.contract ? (
          // Show contract details after creation
          <ContractDetailsView
            contract={amountModal.contract}
            secondsLeft={secondsLeft}
            error={error}
            approvingContract={approvingContract}
          />
        ) : (
          // Show amount input form
          <div className="space-y-4">
            {amountModal.recipient && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Recipient:</span>{" "}
                  <span className="text-gray-600 dark:text-gray-400">
                    {amountModal.recipient?.entity?.company?.name ||
                      [
                        amountModal.recipient?.entity?.consumer?.givenNames,
                        amountModal.recipient?.entity?.consumer?.familyName,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                      "-"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Currency:</span>{" "}
                  <span className="text-gray-600 dark:text-gray-400">{amountModal.recipient.currency || "-"}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Recipient ID:</span>{" "}
                  <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {amountModal.recipient?.recipientId?.xeRecipientId || "-"}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="contractAmount"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Amount (USD) to Sell
              </label>
              <input
                id="contractAmount"
                type="number"
                step="0.01"
                min="0.01"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                placeholder="Enter amount in USD"
                value={contractAmount}
                onChange={(e) => setContractAmount(e.target.value)}
                disabled={creatingContract}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The recipient will receive the equivalent in {amountModal.recipient?.currency || "their currency"} based
                on the current exchange rate.
              </p>
            </div>

            {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
