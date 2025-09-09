const asyncHandler = require("../middleware/asyncHandler");
const Payment = require("../models/Payment");
const PaymentBatch = require("../models/PaymentBatch");
const xeService = require("../services/xeService");
const { successResponse, errorResponse } = require("../utils/responseHelper");

// @desc    Test XE API connection
// @route   GET /api/xe/test
// @access  Public
const testXeConnection = asyncHandler(async (req, res) => {
  console.log("🧪 Testing XE API connection");

  try {
    const result = await xeService.testConnection();

    if (result.success) {
      successResponse(res, result.data, result.message);
    } else {
      return errorResponse(res, result.error, 400, {
        message: "XE API connection failed",
        suggestion: "Please check your API configuration and network connectivity.",
        action: "Check configuration",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }
  } catch (error) {
    console.error("Error testing XE connection:", error);
    return errorResponse(res, "Connection Test Error", 500, {
      message: "An unexpected error occurred while testing the connection.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry test",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Get XE accounts
// @route   GET /api/xe/accounts
// @access  Public
const getXeAccounts = asyncHandler(async (req, res) => {
  console.log("🏦 Fetching XE accounts");

  try {
    const result = await xeService.getAccounts();

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to fetch XE accounts",
        suggestion: "Please check your XE API configuration and try again.",
        action: "Check API configuration",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    const accounts = result.data || [];

    successResponse(res, accounts, "XE accounts retrieved successfully");
  } catch (error) {
    console.error("Error in getXeAccounts:", error);
    return errorResponse(res, "Failed to retrieve accounts", 500, {
      message: "An unexpected error occurred while fetching XE accounts.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Get payment fields for country and currency
// @route   GET /api/xe/payment-fields/:countryCode/:currencyCode
// @access  Public
const getPaymentFields = asyncHandler(async (req, res) => {
  const { countryCode, currencyCode } = req.params;

  console.log(`🌍 Fetching payment fields for ${countryCode}/${currencyCode}`);

  try {
    const result = await xeService.getPaymentFields(countryCode, currencyCode);

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to fetch payment fields",
        suggestion: "Please check the country and currency codes and try again.",
        action: "Verify country/currency codes",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    const fields = result.data || [];

    successResponse(
      res,
      {
        countryCode,
        currencyCode,
        fields,
      },
      `Payment fields for ${countryCode}/${currencyCode} retrieved successfully`
    );
  } catch (error) {
    console.error("Error in getPaymentFields:", error);
    return errorResponse(res, "Failed to retrieve payment fields", 500, {
      message: "An unexpected error occurred while fetching payment fields.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Create XE recipient
// @route   POST /api/xe/recipients
// @access  Public
const createXeRecipient = asyncHandler(async (req, res) => {
  const recipientData = req.body;

  console.log("👤 Creating XE recipient:", recipientData.email);

  try {
    const result = await xeService.createRecipient(recipientData);

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to create XE recipient",
        suggestion: "Please check the recipient data and try again.",
        action: "Verify recipient data",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    successResponse(res, result.data, "XE recipient created successfully");
  } catch (error) {
    console.error("Error in createXeRecipient:", error);
    return errorResponse(res, "Failed to create recipient", 500, {
      message: "An unexpected error occurred while creating the recipient.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Create XE payment
// @route   POST /api/xe/payments
// @access  Public
const createXePayment = asyncHandler(async (req, res) => {
  const paymentData = req.body;

  console.log("💰 Creating XE payment:", {
    recipientId: paymentData.recipientId,
    amount: paymentData.amount,
  });

  try {
    const result = await xeService.createPayment(paymentData);

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to create XE payment",
        suggestion: "Please check the payment data and try again.",
        action: "Verify payment data",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    successResponse(res, result.data, "XE payment created successfully");
  } catch (error) {
    console.error("Error in createXePayment:", error);
    return errorResponse(res, "Failed to create payment", 500, {
      message: "An unexpected error occurred while creating the payment.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Get XE payment status
// @route   GET /api/xe/payments/:paymentId/status
// @access  Public
const getXePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  console.log(`📊 Getting XE payment status: ${paymentId}`);

  try {
    const result = await xeService.getPaymentStatus(paymentId);

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to get XE payment status",
        suggestion: "Please check the payment ID and try again.",
        action: "Verify payment ID",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    successResponse(res, result.data, "XE payment status retrieved successfully");
  } catch (error) {
    console.error("Error in getXePaymentStatus:", error);
    return errorResponse(res, "Failed to retrieve payment status", 500, {
      message: "An unexpected error occurred while fetching payment status.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Process XE bank transfer batch
// @route   POST /api/xe/batches/:batchId/process
// @access  Public
const processXeBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { xeConfig } = req.body;

  console.log(`🏦 Processing XE bank transfer batch: ${batchId}`);

  // Find the batch
  const batch = await PaymentBatch.findOne({ batchId });
  if (!batch) {
    return errorResponse(res, "Payment batch not found", 404);
  }

  // Verify batch is configured for XE bank transfers
  if (batch.paymentMethod !== "xe_bank_transfer") {
    return errorResponse(res, "Batch is not configured for XE bank transfers", 400, {
      message: "This batch is not set up for XE bank transfers",
      suggestion: "Please select a batch that is configured for XE bank transfers.",
      action: "Select correct payment method",
      severity: "warning",
      retryable: false,
    });
  }

  // Get pending payments
  const payments = await Payment.find({
    batchId,
    status: "pending",
    paymentMethod: "xe_bank_transfer",
  });

  if (payments.length === 0) {
    return errorResponse(res, "No pending XE bank transfer payments found in this batch", 400);
  }

  // Update batch status
  batch.status = "processing";
  batch.processedAt = new Date();

  // Store XE configuration
  if (xeConfig) {
    batch.xeAccountNumber = xeConfig.accountNumber;
    batch.xeConfigData = xeConfig;
  }

  await batch.save();

  // Update payment statuses
  await Payment.updateMany(
    { batchId, status: "pending", paymentMethod: "xe_bank_transfer" },
    { status: "processing", processedAt: new Date() }
  );

  try {
    console.log(`Starting XE bank transfer processing for batch ${batchId} with ${payments.length} payments`);

    // For now, we'll implement a placeholder processing logic
    // In a real implementation, you would:
    // 1. Create recipients in XE for each payment
    // 2. Create bank transfer payments in XE
    // 3. Handle the responses and update payment statuses

    const processedPayments = [];
    let successCount = 0;
    let failureCount = 0;

    for (const payment of payments) {
      try {
        // Placeholder: In real implementation, you would create recipient and payment via XE API
        // For now, we'll simulate the process

        // Update payment with placeholder XE data
        await payment.updateStatus("completed", {
          xeRecipientId: `xe_recipient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          xePaymentId: `xe_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          xeStatus: "processing",
          completedAt: new Date(),
        });

        processedPayments.push({
          payment: payment,
          success: true,
          xeRecipientId: payment.xeRecipientId,
          xePaymentId: payment.xePaymentId,
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to process payment ${payment._id}:`, error);

        await payment.updateStatus("failed", {
          errorMessage: error.message,
          completedAt: new Date(),
        });

        processedPayments.push({
          payment: payment,
          success: false,
          error: error.message,
        });

        failureCount++;
      }
    }

    // Update batch counts
    await batch.updateCounts();

    console.log(`XE batch processing completed: ${successCount} successful, ${failureCount} failed`);

    // Check if all payments failed
    if (successCount === 0 && failureCount > 0) {
      batch.status = "failed";
      batch.errorMessage = "All XE bank transfer payments failed";
      await batch.save();

      return errorResponse(res, "All XE bank transfer payments failed", 400, {
        message: "All bank transfer payments failed to process",
        suggestion: "Please check the error details and try again.",
        action: "Review errors and retry",
        severity: "error",
        retryable: true,
        details: {
          batch,
          summary: {
            totalProcessed: payments.length,
            successful: successCount,
            failed: failureCount,
          },
          errors: processedPayments
            .filter((p) => !p.success)
            .map((p) => ({
              paymentId: p.payment._id,
              error: p.error,
            })),
        },
      });
    }

    // Check if some payments failed
    if (failureCount > 0) {
      const message = `XE batch processed with ${successCount} successful and ${failureCount} failed payments`;
      return successResponse(
        res,
        {
          batch,
          summary: {
            totalProcessed: payments.length,
            successful: successCount,
            failed: failureCount,
          },
          hasFailures: true,
          processedPayments,
        },
        message
      );
    }

    // All successful
    successResponse(
      res,
      {
        batch,
        summary: {
          totalProcessed: payments.length,
          successful: successCount,
          failed: failureCount,
        },
        hasFailures: false,
        processedPayments,
      },
      "All XE bank transfers processed successfully"
    );
  } catch (error) {
    console.error("Error processing XE batch:", error);

    // Revert status changes
    batch.status = "failed";
    batch.errorMessage = error.message;
    await batch.save();

    await Payment.updateMany(
      { batchId, status: "processing", paymentMethod: "xe_bank_transfer" },
      {
        status: "failed",
        errorMessage: error.message,
        completedAt: new Date(),
      }
    );

    return errorResponse(res, "XE Processing Error", 500, {
      message: "An unexpected error occurred while processing the XE bank transfer batch.",
      suggestion: "Please try again. If the issue persists, contact support for assistance.",
      action: "Retry or contact support",
      severity: "error",
      retryable: true,
      batchId: batchId,
      timestamp: new Date().toISOString(),
      details: { originalError: error.message },
    });
  }
});

// @desc    Get supported countries and currencies for XE
// @route   GET /api/xe/countries
// @access  Public
const getSupportedCountriesAndCurrencies = asyncHandler(async (req, res) => {
  console.log("🌍 Fetching supported countries and currencies");

  try {
    const result = await xeService.getSupportedCountriesAndCurrencies();

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to fetch supported countries and currencies",
        suggestion: "Please check your XE API configuration and try again.",
        action: "Check API configuration",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    const countries = result.data || [];

    successResponse(res, countries, "Supported countries and currencies retrieved successfully");
  } catch (error) {
    console.error("Error in getSupportedCountriesAndCurrencies:", error);
    return errorResponse(res, "Failed to retrieve countries and currencies", 500, {
      message: "An unexpected error occurred while fetching supported countries and currencies.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

module.exports = {
  testXeConnection,
  getXeAccounts,
  getPaymentFields,
  createXeRecipient,
  createXePayment,
  getXePaymentStatus,
  processXeBatch,
  getSupportedCountriesAndCurrencies,
};
