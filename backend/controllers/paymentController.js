const asyncHandler = require("../middleware/asyncHandler");
const Payment = require("../models/Payment");
const PaymentBatch = require("../models/PaymentBatch");
const XeContract = require("../models/XeContract");
const paypalConfig = require("../config/paypal");
const { successResponse, errorResponse, paginatedResponse } = require("../utils/responseHelper");
const { formatPayPalErrorResponse, createUserFriendlyMessage } = require("../utils/paypalErrorMapper");

// @desc    Get all payment batches
// @route   GET /api/payments/batches
// @access  Public
const getPaymentBatches = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const batches = await PaymentBatch.find().sort({ createdAt: -1 }).skip(skip).limit(limit);

  const totalCount = await PaymentBatch.countDocuments();

  paginatedResponse(res, batches, totalCount, page, limit, "Payment batches retrieved successfully");
});

// @desc    Get single payment batch
// @route   GET /api/payments/batches/:batchId
// @access  Public
const getPaymentBatch = asyncHandler(async (req, res) => {
  const batch = await PaymentBatch.findOne({ batchId: req.params.batchId });

  if (!batch) {
    return errorResponse(res, "Payment batch not found", 404);
  }

  const payments = await Payment.findByBatch(req.params.batchId);

  successResponse(res, { batch, payments }, "Payment batch retrieved successfully");
});

// @desc    Get payments by batch
// @route   GET /api/payments/batches/:batchId/payments
// @access  Public
const getPaymentsByBatch = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status;

  let query = { batchId: req.params.batchId };
  if (status) {
    query.status = status;
  }

  const payments = await Payment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

  const totalCount = await Payment.countDocuments(query);

  paginatedResponse(res, payments, totalCount, page, limit, "Payments retrieved successfully");
});

// @desc    Process payment batch
// @route   POST /api/payments/batches/:batchId/process
// @access  Public
const processPaymentBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { senderBatchHeader } = req.body;

  // Find the batch
  const batch = await PaymentBatch.findOne({ batchId });
  if (!batch) {
    return errorResponse(res, "Payment batch not found", 404);
  }

  // Get pending payments
  const payments = await Payment.find({
    batchId,
    status: "pending",
  });

  if (payments.length === 0) {
    return errorResponse(res, "No pending payments found in this batch", 400);
  }

  // Update batch status
  batch.status = "processing";
  batch.processedAt = new Date();
  await batch.save();

  // Update payment statuses
  await Payment.updateMany({ batchId, status: "pending" }, { status: "processing", processedAt: new Date() });

  try {
    console.log(`Starting PayPal payout for batch ${batchId} with ${payments.length} payments`);

    // Create PayPal payout
    const payoutResult = await paypalConfig.createPayout(batchId, payments, senderBatchHeader);

    console.log("PayPal payout result:", JSON.stringify(payoutResult, null, 2));

    if (!payoutResult.success) {
      console.error("PayPal payout failed:", payoutResult.error);

      // Map PayPal error to user-friendly message
      const errorInfo = formatPayPalErrorResponse(payoutResult.details || payoutResult.error);
      const userFriendlyMessage = createUserFriendlyMessage(payoutResult.details || payoutResult.error);

      // Revert status changes
      batch.status = "failed";
      batch.errorMessage = userFriendlyMessage;
      await batch.save();

      await Payment.updateMany(
        { batchId, status: "processing" },
        {
          status: "failed",
          errorMessage: userFriendlyMessage,
          completedAt: new Date(),
        }
      );

      return errorResponse(res, errorInfo.error, 400, {
        message: errorInfo.message,
        suggestion: errorInfo.suggestion,
        action: errorInfo.action,
        severity: errorInfo.severity,
        retryable: errorInfo.retryable,
        details: errorInfo.details,
      });
    }

    // Validate PayPal response structure
    if (!payoutResult.data) {
      console.error("PayPal response missing data field:", payoutResult);
      throw new Error("Invalid PayPal response: missing data field");
    }

    if (!payoutResult.data.batch_header) {
      console.error("PayPal response missing batch_header:", payoutResult.data);
      throw new Error("Invalid PayPal response: missing batch_header");
    }

    console.log("PayPal batch header:", JSON.stringify(payoutResult.data.batch_header, null, 2));

    // Update batch with PayPal response
    batch.paypalPayoutBatchId = payoutResult.data.batch_header.payout_batch_id;
    batch.paypalBatchStatus = payoutResult.data.batch_header.batch_status;
    await batch.save();

    console.log(`Updated batch ${batchId} with PayPal batch ID: ${batch.paypalPayoutBatchId}`);

    // Check if items array exists in the response
    const payoutItems = payoutResult.data.items;

    if (!payoutItems || !Array.isArray(payoutItems)) {
      console.warn("PayPal response does not include items array. This might be normal for async processing.");
      console.log("PayPal response structure:", Object.keys(payoutResult.data));

      // For some PayPal configurations, items might not be immediately available
      // We'll mark payments as processing and let the sync function handle the updates later
      console.log("Marking payments as processing - will sync with PayPal later");

      // Update batch counts
      await batch.updateCounts();

      successResponse(
        res,
        {
          batch,
          paypalResponse: payoutResult.data,
          note: "Payout submitted to PayPal. Item details will be available after processing.",
        },
        "Payment batch submitted to PayPal successfully"
      );
      return;
    }

    console.log(`Processing ${payoutItems.length} payout items from PayPal response`);

    // Validate that we have the expected number of items
    if (payoutItems.length !== payments.length) {
      console.warn(`Mismatch: Expected ${payments.length} items, received ${payoutItems.length} from PayPal`);
    }

    // Update individual payments with PayPal item IDs
    for (let i = 0; i < Math.min(payoutItems.length, payments.length); i++) {
      const payoutItem = payoutItems[i];
      const payment = payments[i];

      console.log(`Updating payment ${i + 1}/${payments.length}:`, {
        paymentId: payment._id,
        paypalItemId: payoutItem.payout_item_id,
        transactionStatus: payoutItem.transaction_status,
      });

      await payment.updateStatus("completed", {
        paypalPayoutItemId: payoutItem.payout_item_id,
        transactionId: payoutItem.transaction_id,
        paypalTransactionStatus: payoutItem.transaction_status,
        completedAt: new Date(),
      });
    }

    // Handle any remaining payments that weren't matched
    if (payments.length > payoutItems.length) {
      console.warn(`${payments.length - payoutItems.length} payments were not matched with PayPal items`);
    }

    // Update batch counts
    await batch.updateCounts();

    console.log(`Successfully processed payment batch ${batchId}`);

    successResponse(
      res,
      {
        batch,
        paypalResponse: payoutResult.data,
      },
      "Payment batch processed successfully"
    );
  } catch (error) {
    console.error("Error processing payment batch:", error);
    console.error("Error stack:", error.stack);
    console.error("Batch ID:", batchId);
    console.error("Number of payments:", payments.length);

    // Log additional context if available
    if (error.response) {
      console.error("HTTP Response Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }

    // Check if this is a PayPal API error
    let errorInfo;
    if (error.response && error.response.data) {
      // This is likely a PayPal API error
      errorInfo = formatPayPalErrorResponse(error.response.data);
    } else {
      // This is a general error
      errorInfo = {
        error: "Processing Error",
        message: "An unexpected error occurred while processing the payment batch.",
        suggestion: "Please try again. If the issue persists, contact support for assistance.",
        action: "Retry or contact support",
        severity: "error",
        retryable: true,
        details: { originalError: error.message },
      };
    }

    const userFriendlyMessage = errorInfo.message + " " + errorInfo.suggestion;

    // Revert status changes
    batch.status = "failed";
    batch.errorMessage = userFriendlyMessage;
    await batch.save();

    console.log(`Reverting batch ${batchId} status to failed`);

    await Payment.updateMany(
      { batchId, status: "processing" },
      {
        status: "failed",
        errorMessage: userFriendlyMessage,
        completedAt: new Date(),
      }
    );

    console.log(`Updated all processing payments in batch ${batchId} to failed status`);

    return errorResponse(res, errorInfo.error, 500, {
      message: errorInfo.message,
      suggestion: errorInfo.suggestion,
      action: errorInfo.action,
      severity: errorInfo.severity,
      retryable: errorInfo.retryable,
      batchId: batchId,
      timestamp: new Date().toISOString(),
      details: errorInfo.details,
    });
  }
});

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Public
const getPaymentStats = asyncHandler(async (req, res) => {
  const { batchId, period } = req.query;

  // Build date filter
  let dateFilter = {};
  if (period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        break;
    }

    if (startDate) {
      dateFilter.createdAt = { $gte: startDate };
    }
  }

  // Build match criteria
  let matchCriteria = { ...dateFilter };
  if (batchId) {
    matchCriteria.batchId = batchId;
  }

  // Get payment statistics
  const stats = await Payment.aggregate([
    { $match: matchCriteria },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  // Get batch statistics
  const batchStats = await PaymentBatch.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalBatches: { $sum: 1 },
        totalPayments: { $sum: "$totalPayments" },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);

  const result = {
    paymentStats: stats,
    batchStats: batchStats[0] || { totalBatches: 0, totalPayments: 0, totalAmount: 0 },
    period: period || "all",
  };

  successResponse(res, result, "Payment statistics retrieved successfully");
});

// @desc    Get dashboard statistics
// @route   GET /api/payments/dashboard-stats
// @access  Public
const getDashboardStats = asyncHandler(async (req, res) => {
  // Get completed payments grouped by payment method
  const paymentStats = await Payment.aggregate([
    {
      $match: {
        status: "completed",
      },
    },
    {
      $group: {
        _id: "$paymentMethod",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  // Initialize stats object
  const stats = {
    xe: {
      contracts: 0,
      payments: 0,
      totalAmount: 0,
    },
    paypal: {
      payments: 0,
      totalAmount: 0,
    },
    giftogram: {
      giftCards: 0,
      totalAmount: 0,
    },
  };

  // Process payment stats
  paymentStats.forEach((stat) => {
    if (stat._id === "xe_bank_transfer") {
      stats.xe.payments = stat.count;
      stats.xe.totalAmount = stat.totalAmount;
    } else if (stat._id === "paypal") {
      stats.paypal.payments = stat.count;
      stats.paypal.totalAmount = stat.totalAmount;
    } else if (stat._id === "giftogram") {
      stats.giftogram.giftCards = stat.count;
      stats.giftogram.totalAmount = stat.totalAmount;
    }
  });

  // Get XE contracts statistics (settled contracts)
  const xeContracts = await XeContract.aggregate([
    {
      $match: {
        settlementStatus: { $in: ["Settled", "PartiallySettled"] },
      },
    },
    {
      $project: {
        contractNumber: "$identifier.contractNumber",
        settlementAmount: {
          $cond: {
            if: { $and: [{ $isArray: "$summary" }, { $gt: [{ $size: "$summary" }, 0] }] },
            then: {
              $sum: {
                $map: {
                  input: "$summary",
                  as: "summaryItem",
                  in: { $ifNull: ["$$summaryItem.settlementAmount.amount", 0] },
                },
              },
            },
            else: 0,
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalAmount: { $sum: "$settlementAmount" },
      },
    },
  ]);

  if (xeContracts.length > 0 && xeContracts[0].count > 0) {
    stats.xe.contracts = xeContracts[0].count;
    // Use contract amounts if payments amount is 0 or add to it
    if (stats.xe.totalAmount === 0) {
      stats.xe.totalAmount = xeContracts[0].totalAmount || 0;
    } else {
      // If we have both payments and contracts, use the higher amount or combine logic
      // For now, prefer payments amount as it's more accurate
      stats.xe.totalAmount = Math.max(stats.xe.totalAmount, xeContracts[0].totalAmount || 0);
    }
  }

  successResponse(res, stats, "Dashboard statistics retrieved successfully");
});

// @desc    Update batch payment method
// @route   PUT /api/payments/batches/:batchId/payment-method
// @access  Public
const updateBatchPaymentMethod = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { paymentMethod, config } = req.body;

  // Validate payment method
  const validMethods = ["paypal", "giftogram", "xe_bank_transfer"];
  if (!validMethods.includes(paymentMethod)) {
    return errorResponse(res, "Invalid payment method", 400, {
      message: `Payment method must be one of: ${validMethods.join(", ")}`,
      suggestion: "Please select a valid payment method.",
      action: "Select valid payment method",
      severity: "warning",
      retryable: false,
    });
  }

  // Find the batch
  const batch = await PaymentBatch.findOne({ batchId });
  if (!batch) {
    return errorResponse(res, "Payment batch not found", 404);
  }

  // Check if batch can be modified
  if (batch.status !== "uploaded" && batch.status !== "draft") {
    return errorResponse(res, "Cannot modify payment method for processed batch", 400, {
      message: "Payment method can only be changed for uploaded or draft batches",
      suggestion: "Create a new batch to use a different payment method.",
      action: "Create new batch",
      severity: "warning",
      retryable: false,
    });
  }

  // Update batch payment method
  batch.paymentMethod = paymentMethod;

  // Store method-specific configuration
  if (config) {
    if (paymentMethod === "giftogram") {
      batch.giftogramCampaignId = config.campaignId;
      batch.giftogramMessage = config.message;
      batch.giftogramSubject = config.subject;
    } else if (paymentMethod === "xe_bank_transfer") {
      batch.xeAccountNumber = config.accountNumber;
      batch.xeConfigData = config;
    }
  }

  await batch.save();

  // Update all payments in the batch
  await Payment.updateMany({ batchId }, { paymentMethod });

  console.log(`Updated batch ${batchId} payment method to ${paymentMethod}`);

  successResponse(
    res,
    {
      batch,
      updatedPayments: await Payment.countDocuments({ batchId }),
    },
    `Batch payment method updated to ${paymentMethod}`
  );
});

// @desc    Update payment status
// @route   PUT /api/payments/:paymentId/status
// @access  Public
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const { status, errorMessage } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return errorResponse(res, "Payment not found", 404);
  }

  await payment.updateStatus(status, { errorMessage });

  // Update batch counts
  const batch = await PaymentBatch.findOne({ batchId: payment.batchId });
  if (batch) {
    await batch.updateCounts();
  }

  successResponse(res, payment, "Payment status updated successfully");
});

// @desc    Sync with PayPal status
// @route   POST /api/payments/batches/:batchId/sync
// @access  Public
const syncWithPayPal = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  console.log(`Starting PayPal sync for batch: ${batchId}`);

  const batch = await PaymentBatch.findOne({ batchId });
  if (!batch || !batch.paypalPayoutBatchId) {
    console.error(`Batch not found or missing PayPal batch ID: ${batchId}`);
    return errorResponse(res, "PayPal batch ID not found", 404);
  }

  console.log(`Found batch with PayPal ID: ${batch.paypalPayoutBatchId}`);

  try {
    // Get batch status from PayPal
    const batchResult = await paypalConfig.getPayoutBatch(batch.paypalPayoutBatchId);

    console.log("PayPal sync result:", JSON.stringify(batchResult, null, 2));

    if (!batchResult.success) {
      console.error("Failed to sync with PayPal:", batchResult.error);

      // Map PayPal error to user-friendly message
      const errorInfo = formatPayPalErrorResponse(batchResult.details || batchResult.error);

      return errorResponse(res, errorInfo.error, 400, {
        message: errorInfo.message,
        suggestion: errorInfo.suggestion,
        action: errorInfo.action,
        severity: errorInfo.severity,
        retryable: errorInfo.retryable,
        details: errorInfo.details,
      });
    }

    // Update batch status
    const oldBatchStatus = batch.paypalBatchStatus;
    batch.paypalBatchStatus = batchResult.data.batch_header.batch_status;
    await batch.save();

    console.log(`Updated batch status from ${oldBatchStatus} to ${batch.paypalBatchStatus}`);

    // Check if items are available
    const payoutItems = batchResult.data.items;

    if (!payoutItems || !Array.isArray(payoutItems)) {
      console.warn("PayPal sync response does not include items array yet");
      console.log("Available fields in PayPal response:", Object.keys(batchResult.data));

      // Update batch counts anyway
      await batch.updateCounts();

      return successResponse(
        res,
        {
          batch,
          note: "Batch status updated, but individual payment details not yet available from PayPal",
        },
        "Partially synced with PayPal"
      );
    }

    console.log(`Processing ${payoutItems.length} items from PayPal sync`);

    // Update individual payment statuses
    let updatedCount = 0;
    for (const item of payoutItems) {
      console.log(`Processing PayPal item:`, {
        payout_item_id: item.payout_item_id,
        transaction_status: item.transaction_status,
        transaction_id: item.transaction_id,
      });

      const payment = await Payment.findOne({
        paypalPayoutItemId: item.payout_item_id,
      });

      if (payment) {
        const oldStatus = payment.status;
        let newStatus = "pending";

        if (item.transaction_status === "SUCCESS") {
          newStatus = "completed";
        } else if (item.transaction_status === "FAILED") {
          newStatus = "failed";
        } else if (item.transaction_status === "PENDING") {
          newStatus = "processing";
        }

        await payment.updateStatus(newStatus, {
          paypalTransactionStatus: item.transaction_status,
          transactionId: item.transaction_id,
        });

        console.log(`Updated payment ${payment._id} status from ${oldStatus} to ${newStatus}`);
        updatedCount++;
      } else {
        console.warn(`Payment not found for PayPal item ID: ${item.payout_item_id}`);
      }
    }

    // Update batch counts
    await batch.updateCounts();

    console.log(`Successfully synced batch ${batchId}. Updated ${updatedCount} payments.`);

    successResponse(
      res,
      {
        batch,
        syncDetails: {
          itemsProcessed: payoutItems.length,
          paymentsUpdated: updatedCount,
          batchStatus: batch.paypalBatchStatus,
        },
      },
      "Successfully synced with PayPal"
    );
  } catch (error) {
    console.error("Error syncing with PayPal:", error);
    console.error("Error stack:", error.stack);

    // Check if this is a PayPal API error
    let errorInfo;
    if (error.response && error.response.data) {
      // This is likely a PayPal API error
      errorInfo = formatPayPalErrorResponse(error.response.data);
    } else {
      // This is a general error
      errorInfo = {
        error: "Sync Error",
        message: "An unexpected error occurred while syncing with PayPal.",
        suggestion: "Please try again. If the issue persists, contact support for assistance.",
        action: "Retry sync operation",
        severity: "error",
        retryable: true,
        details: { originalError: error.message },
      };
    }

    return errorResponse(res, errorInfo.error, 500, {
      message: errorInfo.message,
      suggestion: errorInfo.suggestion,
      action: errorInfo.action,
      severity: errorInfo.severity,
      retryable: errorInfo.retryable,
      batchId: batchId,
      details: errorInfo.details,
    });
  }
});

// @desc    Get PayPal account balance
// @route   GET /api/payments/account/balance
// @access  Public
const getAccountBalance = asyncHandler(async (req, res) => {
  console.log("Getting PayPal account balance");

  try {
    // Get account balance from PayPal
    const balanceResult = await paypalConfig.getAccountBalance();

    console.log("PayPal balance result:", JSON.stringify(balanceResult, null, 2));

    if (!balanceResult.success) {
      console.error("Failed to get account balance:", balanceResult.error);

      // Map PayPal error to user-friendly message
      const errorInfo = formatPayPalErrorResponse(balanceResult.details || balanceResult.error);

      return errorResponse(res, errorInfo.error, 400, {
        message: errorInfo.message,
        suggestion: errorInfo.suggestion,
        action: errorInfo.action,
        severity: errorInfo.severity,
        retryable: errorInfo.retryable,
        details: errorInfo.details,
      });
    }

    const responseData = {
      balances: balanceResult.data.balances || [],
      fallback: balanceResult.data.fallback || false,
      message: balanceResult.data.message || "Account balance retrieved successfully",
      recent_transactions: balanceResult.data.recent_transactions || null,
      last_updated: new Date().toISOString(),
    };

    return successResponse(res, responseData, "Account balance retrieved successfully");
  } catch (error) {
    console.error("Error in getAccountBalance controller:", error);

    // Check if this is a PayPal API error
    let errorInfo;
    if (error.response && error.response.data) {
      // This is likely a PayPal API error
      errorInfo = formatPayPalErrorResponse(error.response.data);
    } else {
      // This is a general error
      errorInfo = {
        error: "Account Balance Error",
        message: "An unexpected error occurred while retrieving account balance.",
        suggestion: "Please try again. If the issue persists, contact support for assistance.",
        action: "Retry balance check",
        severity: "error",
        retryable: true,
        details: { originalError: error.message },
      };
    }

    return errorResponse(res, errorInfo.error, 500, {
      message: errorInfo.message,
      suggestion: errorInfo.suggestion,
      action: errorInfo.action,
      severity: errorInfo.severity,
      retryable: errorInfo.retryable,
      details: errorInfo.details,
    });
  }
});

module.exports = {
  getPaymentBatches,
  getPaymentBatch,
  getPaymentsByBatch,
  processPaymentBatch,
  getPaymentStats,
  getDashboardStats,
  updateBatchPaymentMethod,
  updatePaymentStatus,
  syncWithPayPal,
  getAccountBalance,
};
