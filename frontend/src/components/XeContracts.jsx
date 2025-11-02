import React, { useEffect, useState } from "react";
import { getAllXeContracts, approveXeContract, cancelXeContract } from "../services/xeService";
import { ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import XeContractDetailsModal from "./XeContractDetailsModal";

export default function XeContracts() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedContracts, setSelectedContracts] = useState(new Set());
  const [approvingContracts, setApprovingContracts] = useState(new Set());
  const [cancellingContracts, setCancellingContracts] = useState(new Set());
  const [contractTimers, setContractTimers] = useState({});
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedContractNumber, setSelectedContractNumber] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAllXeContracts({ page, limit, search: search || undefined });
      setItems(response?.data?.items || []);
      setTotalPages(response?.data?.totalPages || 1);
    } catch (e) {
      setError(e.message || "Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Countdown timers for contracts
  useEffect(() => {
    const intervals = {};
    items.forEach((contract) => {
      const contractNumber = contract.identifier?.contractNumber;
      if (!contractNumber || !contract.quote?.expires) return;

      const calculateTimeLeft = () => {
        try {
          const expires = contract.quote.expires instanceof Date
            ? contract.quote.expires
            : new Date(contract.quote.expires);
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
  }, [items]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

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
    if (selectedContracts.size === items.length) {
      setSelectedContracts(new Set());
    } else {
      setSelectedContracts(new Set(items.map((c) => c.identifier?.contractNumber).filter(Boolean)));
    }
  };

  const handleApprove = async (contractNumber) => {
    setApprovingContracts((prev) => new Set(prev).add(contractNumber));
    setError("");

    try {
      await approveXeContract(contractNumber);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to approve contract");
    } finally {
      setApprovingContracts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(contractNumber);
        return newSet;
      });
    }
  };

  const handleApproveSelected = async () => {
    if (selectedContracts.size === 0) {
      setError("Please select at least one contract to approve");
      return;
    }

    const contractNumbers = Array.from(selectedContracts);
    setApprovingContracts(new Set(contractNumbers));
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

    setApprovingContracts(new Set());
    setSelectedContracts(new Set());
    await fetchData();

    if (results.failed.length > 0) {
      setError(`${results.failed.length} contract(s) failed to approve. ${results.success.length} approved successfully.`);
    } else {
      setError("");
    }
  };

  const handleCancel = async (contractNumber) => {
    setCancellingContracts((prev) => new Set(prev).add(contractNumber));
    setError("");

    try {
      await cancelXeContract(contractNumber);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to cancel contract");
    } finally {
      setCancellingContracts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(contractNumber);
        return newSet;
      });
    }
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return "Expired";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">XE Contracts</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View and manage all XE contracts
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

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="Search by contract number, recipient ID, or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>
        {selectedContracts.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedContracts.size} selected
            </span>
            <Button
              variant="primary"
              onClick={handleApproveSelected}
              disabled={approvingContracts.size > 0}
              loading={approvingContracts.size > 0}
            >
              Approve Selected
            </Button>
          </div>
        )}
      </div>

      {/* Contracts Table */}
      <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectedContracts.size === items.length && items.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Contract Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Recipient
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Exchange Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status
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
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No contracts found</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search criteria</p>
                  </div>
                </td>
              </tr>
            )}
            {items.map((contract) => {
              const fxDetail = contract.quote?.fxDetails?.[0];
              const sellAmount = fxDetail?.sell?.amount || contract.paymentRequest?.sellAmount?.amount || 0;
              const sellCurrency = fxDetail?.sell?.currency || contract.paymentRequest?.sellAmount?.currency || "USD";
              const buyCurrency = fxDetail?.buy?.currency || contract.paymentRequest?.buyAmount?.currency || "";
              const rate = fxDetail?.rate?.rate || 0;
              const convertedAmount = rate > 0 && sellAmount > 0 ? sellAmount * rate : fxDetail?.buy?.amount || 0;
              const contractNumber = contract.identifier?.contractNumber;
              const secondsLeft = contractTimers[contractNumber] || 0;
              const isExpired = secondsLeft <= 0;
              const isApproved = contract.status === "Approved" || contract.status === "ContractConfirmed";
              const canApprove = !isExpired && !isApproved && contract.quoteStatus === "Valid";

              // Try to get recipient name - we may need to look it up or store it
              const recipientName = "Recipient"; // Placeholder - you might want to join with recipients collection

              return (
                <tr
                  key={contract._id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 ${
                    selectedContracts.has(contractNumber) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
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
                    <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {contractNumber || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {contract.recipientId?.xeRecipientId ? (
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                          {contract.recipientId.xeRecipientId.substring(0, 20)}...
                        </span>
                      ) : (
                        "-"
                      )}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(contract.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedContractNumber(contractNumber);
                          setDetailsModalOpen(true);
                        }}
                      >
                        Get Details
                      </Button>
                      {canApprove && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(contractNumber)}
                          disabled={approvingContracts.has(contractNumber)}
                          loading={approvingContracts.has(contractNumber)}
                        >
                          Approve
                        </Button>
                      )}
                      {!isApproved && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCancel(contractNumber)}
                          disabled={cancellingContracts.has(contractNumber)}
                          loading={cancellingContracts.has(contractNumber)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
            Loading contracts...
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Contract Details Modal */}
      <XeContractDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedContractNumber(null);
        }}
        contractNumber={selectedContractNumber}
      />
    </div>
  );
}

