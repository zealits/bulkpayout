import React, { useState, useEffect } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { getXeContractDetails } from "../services/xeService";

export default function XeContractDetailsModal({ isOpen, onClose, contractNumber }) {
  const [contractDetails, setContractDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && contractNumber) {
      fetchContractDetails();
    } else {
      setContractDetails(null);
      setError("");
    }
  }, [isOpen, contractNumber]);

  const fetchContractDetails = async () => {
    if (!contractNumber) return;

    setLoading(true);
    setError("");
    setContractDetails(null);

    try {
      const response = await getXeContractDetails(contractNumber);
      setContractDetails(response.data?.data || response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch contract details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount, currency) => {
    if (amount === null || amount === undefined) return "N/A";
    return `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ""}`;
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contract Details" size="4xl">
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              Loading contract details...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {contractDetails && !loading && (
          <div className="space-y-6">
            {/* Identifier Section */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                Contract Identifier
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Contract Number</span>
                  <div className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                    {contractDetails.identifier?.contractNumber || "N/A"}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Client Transfer Number</span>
                  <div className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {contractDetails.identifier?.clientTransferNumber || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <span className="text-xs text-gray-600 dark:text-gray-400 block mb-2">Status</span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    contractDetails.status === "ContractConfirmed"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {contractDetails.status || "N/A"}
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <span className="text-xs text-gray-600 dark:text-gray-400 block mb-2">Created Date</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(contractDetails.createdDate)}
                </span>
              </div>
            </div>

            {/* Quote Details */}
            {contractDetails.quote?.fxDetails && contractDetails.quote.fxDetails.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-6 space-y-4 border border-blue-200 dark:border-blue-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                  Quote Details
                </h3>
                {contractDetails.quote.fxDetails.map((fxDetail, index) => (
                  <div key={index} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 font-medium mb-2">
                          Sell Amount
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(fxDetail.sell?.amount, fxDetail.sell?.currency)}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 font-medium mb-2">
                          Buy Amount
                        </div>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(fxDetail.buy?.amount, fxDetail.buy?.currency)}
                        </div>
                      </div>
                    </div>

                    {fxDetail.rate && (
                      <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                          Exchange Rate
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Rate</span>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                              1 {fxDetail.rate.sellCurrency} = {fxDetail.rate.rate?.toFixed(4) || "N/A"}{" "}
                              {fxDetail.rate.buyCurrency}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Inverse Rate</span>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                              1 {fxDetail.rate.buyCurrency} = {fxDetail.rate.inverseRate?.toFixed(4) || "N/A"}{" "}
                              {fxDetail.rate.sellCurrency}
                            </div>
                          </div>
                        </div>
                        {fxDetail.rate.baseCurrency && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Base Currency:</span>
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 ml-2">
                              {fxDetail.rate.baseCurrency}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Effective Date</span>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                          {fxDetail.effectiveDate || "N/A"}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Value Date</span>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                          {fxDetail.valueDate || "N/A"}
                        </div>
                      </div>
                    </div>

                    {fxDetail.quoteType && (
                      <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Quote Type</span>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                          {fxDetail.quoteType}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Settlement Details */}
            {contractDetails.summary && contractDetails.summary.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                  Settlement Summary
                </h3>
                {contractDetails.summary.map((summary, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Settlement Date</span>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                          {formatDate(summary.settlementDate)}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Settlement Method</span>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                          {summary.settlementMethod || "N/A"}
                        </div>
                      </div>
                    </div>

                    {summary.directDebitBankAccount && (
                      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-2">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          Direct Debit Bank Account
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Account Name</span>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                              {summary.directDebitBankAccount.accountName || "N/A"}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Account Number</span>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                              {summary.directDebitBankAccount.accountNumber || "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                        <span className="text-xs text-gray-600 dark:text-gray-400 block mb-2">Settlement Amount</span>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(summary.settlementAmount?.amount, summary.settlementAmount?.currency)}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                        <span className="text-xs text-gray-600 dark:text-gray-400 block mb-2">Settlement Fees</span>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(summary.settlementFees?.amount, summary.settlementFees?.currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Additional Status Information */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <span className="text-xs text-gray-600 dark:text-gray-400 block mb-2">Settlement Status</span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    contractDetails.settlementStatus === "Settled"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {contractDetails.settlementStatus || "N/A"}
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <span className="text-xs text-gray-600 dark:text-gray-400 block mb-2">Quote Status</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {contractDetails.quoteStatus || "N/A"}
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <span className="text-xs text-gray-600 dark:text-gray-400 block mb-2">Contract Type</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {contractDetails.contractType || "N/A"}
                </span>
              </div>
            </div>

            {/* Delivery Method */}
            {contractDetails.deliveryMethod && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <span className="text-xs text-gray-600 dark:text-gray-400 block mb-2">Delivery Method</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {contractDetails.deliveryMethod}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}


