const asyncHandler = require("../middleware/asyncHandler");
const Payment = require("../models/Payment");
const PaymentBatch = require("../models/PaymentBatch");
const giftogramService = require("../services/giftogramService");
const { successResponse, errorResponse } = require("../utils/responseHelper");

// @desc    Get available Giftogram campaigns
// @route   GET /api/giftogram/campaigns
// @access  Public
const getGiftogramCampaigns = asyncHandler(async (req, res) => {
  console.log("🎁 Fetching Giftogram campaigns");

  try {
    const result = await giftogramService.getCampaigns();

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to fetch Giftogram campaigns",
        suggestion: "Please check your Giftogram API configuration and try again.",
        action: "Check API configuration",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    const campaigns = result.data || [];

    successResponse(res, campaigns, "Giftogram campaigns retrieved successfully");
  } catch (error) {
    console.error("Error in getGiftogramCampaigns:", error);
    return errorResponse(res, "Failed to retrieve campaigns", 500, {
      message: "An unexpected error occurred while fetching Giftogram campaigns.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Process gift card batch
// @route   POST /api/giftogram/batches/:batchId/process
// @access  Public
const processGiftogramBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { giftogramConfig } = req.body;

  console.log(`🎁 Processing Giftogram batch: ${batchId}`);

  // Find the batch
  const batch = await PaymentBatch.findOne({ batchId });
  if (!batch) {
    return errorResponse(res, "Payment batch not found", 404);
  }

  // Verify batch is configured for Giftogram
  if (batch.paymentMethod !== "giftogram") {
    return errorResponse(res, "Batch is not configured for Giftogram payments", 400, {
      message: "This batch is not set up for gift card payments",
      suggestion: "Please select a batch that is configured for Giftogram payments.",
      action: "Select correct payment method",
      severity: "warning",
      retryable: false,
    });
  }

  // Get pending payments
  const payments = await Payment.find({
    batchId,
    status: "pending",
    paymentMethod: "giftogram",
  });

  if (payments.length === 0) {
    return errorResponse(res, "No pending Giftogram payments found in this batch", 400);
  }

  // Update batch status
  batch.status = "processing";
  batch.processedAt = new Date();

  // Store Giftogram configuration
  if (giftogramConfig) {
    batch.giftogramCampaignId = giftogramConfig.campaignId;
    batch.giftogramMessage = giftogramConfig.message;
    batch.giftogramSubject = giftogramConfig.subject;
  }

  await batch.save();

  // Update payment statuses
  await Payment.updateMany(
    { batchId, status: "pending", paymentMethod: "giftogram" },
    { status: "processing", processedAt: new Date() }
  );

  try {
    console.log(`Starting Giftogram processing for batch ${batchId} with ${payments.length} payments`);

    // Prepare orders for Giftogram
    const orders = payments.map((payment) => ({
      recipientEmail: payment.recipientEmail,
      recipientName: payment.recipientName,
      amount: payment.amount,
      message:
        giftogramConfig?.message || batch.giftogramMessage || "Thank you for your hard work! Enjoy your gift card!",
      subject: giftogramConfig?.subject || batch.giftogramSubject || "You have received a gift card!",
      notes: giftogramConfig?.notes || `Gift card for ${payment.recipientName}`,
      campaignId: giftogramConfig?.campaignId || batch.giftogramCampaignId,
    }));

    // Process with Giftogram
    const giftogramResult = await giftogramService.createBulkGiftCardOrders(orders, {
      batchSize: 5,
      delay: 1000,
    });

    console.log("Giftogram processing result:", JSON.stringify(giftogramResult, null, 2));

    if (!giftogramResult.success) {
      console.error("Giftogram processing failed:", giftogramResult.error);

      // Revert status changes
      batch.status = "failed";
      batch.errorMessage = giftogramResult.error;
      await batch.save();

      await Payment.updateMany(
        { batchId, status: "processing", paymentMethod: "giftogram" },
        {
          status: "failed",
          errorMessage: giftogramResult.error,
          completedAt: new Date(),
        }
      );

      return errorResponse(res, "Giftogram processing failed", 400, {
        message: giftogramResult.error,
        suggestion: "Please check your Giftogram configuration and try again.",
        action: "Check configuration and retry",
        severity: "error",
        retryable: true,
        details: giftogramResult,
      });
    }

    console.log(`Processing ${giftogramResult.results.length} Giftogram results`);

    // Update individual payments with Giftogram responses
    for (let i = 0; i < giftogramResult.results.length; i++) {
      const result = giftogramResult.results[i];
      const payment = payments[i];

      if (!payment) {
        console.warn(`No payment found for result index ${i}`);
        continue;
      }

      console.log(`Updating payment ${i + 1}/${giftogramResult.results.length}:`, {
        paymentId: payment._id,
        email: result.email,
        success: result.success,
      });

      if (result.success && result.data) {
        // Successful gift card creation
        await payment.updateStatus("completed", {
          giftogramOrderId: result.data.id,
          giftogramExternalId: result.data.external_id,
          giftogramCampaignId: giftogramConfig?.campaignId || batch.giftogramCampaignId,
          giftogramMessage: giftogramConfig?.message || batch.giftogramMessage,
          giftogramSubject: giftogramConfig?.subject || batch.giftogramSubject,
          giftogramStatus: result.data.status,
          completedAt: new Date(),
        });
      } else {
        // Failed gift card creation
        await payment.updateStatus("failed", {
          errorMessage: result.error || "Unknown error occurred",
          completedAt: new Date(),
        });
      }
    }

    // Update batch counts
    await batch.updateCounts();

    console.log(`Successfully processed Giftogram batch ${batchId}`);

    // Check if all orders failed
    if (giftogramResult.successful === 0 && giftogramResult.failed > 0) {
      // Update batch status to failed
      batch.status = "failed";
      batch.errorMessage = "All gift card orders failed";
      await batch.save();

      return errorResponse(res, "All gift card orders failed", 400, {
        message: "All gift card orders failed to process",
        suggestion: "Please check the error details and try again.",
        action: "Review errors and retry",
        severity: "error",
        retryable: true,
        details: {
          batch,
          giftogramResult,
          summary: {
            totalProcessed: giftogramResult.totalProcessed,
            successful: giftogramResult.successful,
            failed: giftogramResult.failed,
            totalAmount: giftogramResult.totalAmount,
          },
          errors: giftogramResult.errors,
        },
      });
    }

    // Check if some orders failed
    if (giftogramResult.failed > 0) {
      // Partial success - some failed, some succeeded
      const message = `Gift card batch processed with ${giftogramResult.successful} successful and ${giftogramResult.failed} failed orders`;
      return successResponse(
        res,
        {
          batch,
          giftogramResult,
          summary: {
            totalProcessed: giftogramResult.totalProcessed,
            successful: giftogramResult.successful,
            failed: giftogramResult.failed,
            totalAmount: giftogramResult.totalAmount,
          },
          hasFailures: true,
          errors: giftogramResult.errors,
        },
        message
      );
    }

    // All successful
    successResponse(
      res,
      {
        batch,
        giftogramResult,
        summary: {
          totalProcessed: giftogramResult.totalProcessed,
          successful: giftogramResult.successful,
          failed: giftogramResult.failed,
          totalAmount: giftogramResult.totalAmount,
        },
        hasFailures: false,
      },
      "All gift cards processed successfully"
    );
  } catch (error) {
    console.error("Error processing Giftogram batch:", error);

    // Revert status changes
    batch.status = "failed";
    batch.errorMessage = error.message;
    await batch.save();

    await Payment.updateMany(
      { batchId, status: "processing", paymentMethod: "giftogram" },
      {
        status: "failed",
        errorMessage: error.message,
        completedAt: new Date(),
      }
    );

    return errorResponse(res, "Processing Error", 500, {
      message: "An unexpected error occurred while processing the gift card batch.",
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

// @desc    Update Giftogram order statuses
// @route   POST /api/giftogram/batches/:batchId/sync
// @access  Public
const syncGiftogramBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  console.log(`🔄 Syncing Giftogram batch: ${batchId}`);

  const batch = await PaymentBatch.findOne({ batchId });
  if (!batch || batch.paymentMethod !== "giftogram") {
    return errorResponse(res, "Giftogram batch not found", 404);
  }

  try {
    // Get all payments with Giftogram order IDs
    const payments = await Payment.find({
      batchId,
      paymentMethod: "giftogram",
      giftogramOrderId: { $exists: true, $ne: null },
    });

    if (payments.length === 0) {
      return successResponse(res, { batch, message: "No Giftogram orders to sync" }, "No orders found to sync");
    }

    console.log(`Found ${payments.length} Giftogram orders to sync`);

    const orderIds = payments.map((p) => p.giftogramOrderId);
    const syncResult = await giftogramService.updateOrderStatuses(orderIds);

    if (!syncResult.success) {
      return errorResponse(res, syncResult.error, 400, {
        message: "Failed to sync with Giftogram",
        suggestion: "Please try again later or contact support.",
        action: "Retry sync operation",
        severity: "error",
        retryable: true,
        details: syncResult,
      });
    }

    // Update payments with latest status
    let updatedCount = 0;
    for (const result of syncResult.results) {
      if (result.success && result.data) {
        const payment = payments.find((p) => p.giftogramOrderId === result.orderId);
        if (payment) {
          const oldStatus = payment.status;
          let newStatus = payment.status;

          // Map Giftogram status to our status
          if (result.data.status === "delivered") {
            newStatus = "completed";
          } else if (result.data.status === "failed" || result.data.status === "cancelled") {
            newStatus = "failed";
          } else if (result.data.status === "processing" || result.data.status === "pending") {
            newStatus = "processing";
          }

          if (newStatus !== oldStatus) {
            await payment.updateStatus(newStatus, {
              giftogramStatus: result.data.status,
            });
            console.log(`Updated payment ${payment._id} status from ${oldStatus} to ${newStatus}`);
            updatedCount++;
          }
        }
      }
    }

    // Update batch counts
    await batch.updateCounts();

    console.log(`Successfully synced Giftogram batch ${batchId}. Updated ${updatedCount} payments.`);

    successResponse(
      res,
      {
        batch,
        syncDetails: {
          ordersProcessed: syncResult.results.length,
          paymentsUpdated: updatedCount,
          successful: syncResult.successful,
          failed: syncResult.failed,
        },
      },
      "Successfully synced with Giftogram"
    );
  } catch (error) {
    console.error("Error syncing Giftogram batch:", error);
    return errorResponse(res, "Sync Error", 500, {
      message: "An unexpected error occurred while syncing with Giftogram.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry sync operation",
      severity: "error",
      retryable: true,
      batchId: batchId,
      details: { originalError: error.message },
    });
  }
});

// @desc    Get Giftogram account funding balance
// @route   GET /api/giftogram/funding
// @access  Public
const getGiftogramFunding = asyncHandler(async (req, res) => {
  console.log("💰 Fetching Giftogram funding balance");

  try {
    const result = await giftogramService.getFunding();

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to fetch Giftogram funding balance",
        suggestion: "Please check your Giftogram API configuration and try again.",
        action: "Check API configuration",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    const fundingData = result.data || {};

    successResponse(res, fundingData, "Giftogram funding balance retrieved successfully");
  } catch (error) {
    console.error("Error in getGiftogramFunding:", error);
    return errorResponse(res, "Failed to retrieve funding balance", 500, {
      message: "An unexpected error occurred while fetching Giftogram funding balance.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Test Giftogram API connection
// @route   GET /api/giftogram/test
// @access  Public
const testGiftogramConnection = asyncHandler(async (req, res) => {
  console.log("🧪 Testing Giftogram API connection");

  try {
    const result = await giftogramService.testConnection();

    if (result.success) {
      successResponse(res, result.data, result.message);
    } else {
      return errorResponse(res, result.error, 400, {
        message: "Giftogram API connection failed",
        suggestion: "Please check your API configuration and network connectivity.",
        action: "Check configuration",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }
  } catch (error) {
    console.error("Error testing Giftogram connection:", error);
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

module.exports = {
  getGiftogramCampaigns,
  processGiftogramBatch,
  syncGiftogramBatch,
  getGiftogramFunding,
  testGiftogramConnection,
};
