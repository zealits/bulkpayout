import React, { useState, useEffect } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { approveXeContract } from "../services/xeService";

export default function ContractModal({ isOpen, onClose, contract, onApproved }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");

  // Calculate seconds left until expiration
  useEffect(() => {
    if (!contract || !contract.quote?.expires) {
      setSecondsLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      try {
        // Handle both string and Date object
        const expires = contract.quote.expires instanceof Date 
          ? contract.quote.expires 
          : new Date(contract.quote.expires);
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
  }, [contract]);

  const handleApprove = async () => {
    if (!contract?.identifier?.contractNumber) return;

    setApproving(true);
    setError("");

    try {
      await approveXeContract(contract.identifier.contractNumber);
      if (onApproved) {
        onApproved(contract);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to approve contract");
    } finally {
      setApproving(false);
    }
  };

  if (!contract) return null;

  // Get conversion rate from quote - extract from fxDetails array
  const fxDetail = contract.quote?.fxDetails?.[0];
  const rate = fxDetail?.rate?.rate || 0;
  const sellCurrency = fxDetail?.sell?.currency || contract.paymentRequest?.sellAmount?.currency || "USD";
  const sellAmount = fxDetail?.sell?.amount || contract.paymentRequest?.sellAmount?.amount || 0;
  const buyCurrency = fxDetail?.buy?.currency || contract.paymentRequest?.buyAmount?.currency || "";
  const buyAmount = fxDetail?.buy?.amount || 0;

  // Format time remaining
  const formatTime = (seconds) => {
    if (seconds <= 0) return "Expired";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const isExpired = secondsLeft <= 0;
  // Check if contract is already approved based on status (could be "Approved", "ContractConfirmed", etc.)
  const isApproved = contract.status && (
    contract.status.toLowerCase().includes("approved") || 
    contract.status.toLowerCase().includes("confirmed")
  );
  // Show approve button if quote is not expired and not already approved
  // Primary check is expiry time - if time hasn't expired, allow approval
  const canApprove = !isExpired && !isApproved;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contract Details" size="lg">
      <div className="space-y-4">
        {/* Contract Information */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Contract Number:</span>
            <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
              {contract.identifier?.contractNumber || "-"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <span
              className={`text-sm font-medium px-2 py-1 rounded ${
                isApproved
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : isExpired
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              }`}
            >
              {contract.status || "Unknown"}
            </span>
          </div>
        </div>

        {/* Conversion Rate and Amounts */}
        {fxDetail && (
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
                  {buyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="text-xl">{buyCurrency}</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-blue-200 dark:border-blue-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exchange Rate:</span>
                <span className="text-base font-semibold text-blue-700 dark:text-blue-300">
                  1 {sellCurrency} = {rate > 0 ? rate.toFixed(4) : "N/A"} {buyCurrency}
                </span>
              </div>
              {rate > 0 && (
                <div className="mt-2 flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                  <span>Inverse Rate:</span>
                  <span className="font-medium">
                    1 {buyCurrency} = {fxDetail.rate?.inverseRate ? fxDetail.rate.inverseRate.toFixed(4) : "N/A"} {sellCurrency}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Show message if fxDetail is missing */}
        {!fxDetail && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Conversion details are not available. The quote may still be processing.
            </p>
          </div>
        )}

        {/* Countdown Timer */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Remaining:</span>
            <span
              className={`text-2xl font-mono font-bold ${
                isExpired ? "text-red-600 dark:text-red-400" : secondsLeft < 60 ? "text-orange-600 dark:text-orange-400" : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {formatTime(secondsLeft)}
            </span>
          </div>
          {isExpired && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">This quote has expired. Please create a new contract.</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={approving}>
            {isApproved ? "Close" : "Cancel"}
          </Button>
          {canApprove && (
            <Button variant="primary" onClick={handleApprove} loading={approving} disabled={approving || isExpired}>
              Approve Contract
            </Button>
          )}
          {isApproved && (
            <div className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm font-medium">
              ✓ Approved
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

