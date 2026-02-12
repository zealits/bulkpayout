const asyncHandler = require("../middleware/asyncHandler");
const Payment = require("../models/Payment");
const PaymentBatch = require("../models/PaymentBatch");
const { getGiftogramService } = require("../services/giftogramService");
const { successResponse, errorResponse } = require("../utils/responseHelper");

// @desc    Get available Giftogram campaigns
// @route   GET /api/giftogram/campaigns
// @access  Public
const getGiftogramCampaigns = asyncHandler(async (req, res) => {
  let environment = req.query.environment || req.body.environment || "sandbox";
  
  // Normalize environment (trim whitespace, lowercase)
  environment = String(environment).trim().toLowerCase();
  
  // Validate environment - default to sandbox if invalid
  if (!["production", "sandbox"].includes(environment)) {
    console.warn(`Invalid environment value received: "${req.query.environment || req.body.environment}", defaulting to sandbox`);
    environment = "sandbox";
  }

  console.log(`🎁 Fetching Giftogram campaigns (environment: ${environment})`);

  try {
    const giftogramService = getGiftogramService(environment);
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

    // Process with Giftogram - use environment from batch
    const environment = batch.environment || "sandbox";
    const giftogramService = getGiftogramService(environment);
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
        // Extract order_id from nested response structure
        const orderId = result.data.data?.order_id || result.data.order_id || result.data.id;
        const externalId = result.data.data?.external_id || result.data.external_id;
        const recipientStatus = result.data.data?.recipients?.[0]?.status || result.data.recipients?.[0]?.status;
        const orderStatus = result.data.data?.status || result.data.status;

        // Determine payment status based on recipient status
        // If recipient status is "pending", payment should be "processing"
        // If recipient status is "sent", payment should be "completed"
        let paymentStatus = "processing";
        if (recipientStatus === "sent") {
          paymentStatus = "completed";
        } else if (recipientStatus === "pending") {
          paymentStatus = "processing";
        }

        console.log(`Updating payment with Giftogram data:`, {
          orderId,
          externalId,
          recipientStatus,
          orderStatus,
          paymentStatus,
        });

        // Successful gift card creation - store order_id and set appropriate status
        const updateData = {
          giftogramOrderId: orderId, // Store order_id for later status checks
          giftogramExternalId: externalId,
          giftogramCampaignId: giftogramConfig?.campaignId || batch.giftogramCampaignId,
          giftogramMessage: giftogramConfig?.message || batch.giftogramMessage,
          giftogramSubject: giftogramConfig?.subject || batch.giftogramSubject,
          giftogramStatus: orderStatus,
        };

        // Only set completedAt if status is completed
        if (paymentStatus === "completed") {
          updateData.completedAt = new Date();
        }

        await payment.updateStatus(paymentStatus, updateData);
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
      // Prefer the first detailed error message from Giftogram, if available
      const firstErrorMessage =
        giftogramResult.errors?.[0]?.error ||
        giftogramResult.results?.find((r) => !r.success && r.error)?.error ||
        "All gift card orders failed";

      // Update batch status and store the exact reason so it can be displayed in history
      batch.status = "failed";
      batch.errorMessage = firstErrorMessage;
      await batch.save();

      return errorResponse(res, "All gift card orders failed", 400, {
        message: firstErrorMessage,
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

// @desc    Process gift card batch with streaming progress (SSE)
// @route   POST /api/giftogram/batches/:batchId/process-stream
// @access  Public
const processGiftogramBatchStream = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { giftogramConfig } = req.body;

  console.log(`🎁 Processing Giftogram batch (stream): ${batchId}`);

  const batch = await PaymentBatch.findOne({ batchId });
  if (!batch) {
    return res.status(404).json({ success: false, error: "Payment batch not found" });
  }

  if (batch.paymentMethod !== "giftogram") {
    return res.status(400).json({ success: false, error: "Batch is not configured for Giftogram payments" });
  }

  const payments = await Payment.find({
    batchId,
    status: "pending",
    paymentMethod: "giftogram",
  });

  if (payments.length === 0) {
    return res.status(400).json({ success: false, error: "No pending Giftogram payments found in this batch" });
  }

  // Store Giftogram configuration
  if (giftogramConfig) {
    batch.giftogramCampaignId = giftogramConfig.campaignId;
    batch.giftogramMessage = giftogramConfig.message;
    batch.giftogramSubject = giftogramConfig.subject;
  }
  await batch.save();

  batch.status = "processing";
  batch.processedAt = new Date();
  await batch.save();

  await Payment.updateMany(
    { batchId, status: "pending", paymentMethod: "giftogram" },
    { status: "processing", processedAt: new Date() }
  );

  // Set SSE headers - response will stream progress
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === "function") res.flush();
  };

  const environment = batch.environment || "sandbox";
  const giftogramService = getGiftogramService(environment);
  const total = payments.length;
  let sentCount = 0;
  let successCount = 0;
  let failCount = 0;

  try {
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      const order = {
        recipientEmail: payment.recipientEmail,
        recipientName: payment.recipientName,
        amount: payment.amount,
        message: giftogramConfig?.message || batch.giftogramMessage || "Thank you for your hard work! Enjoy your gift card!",
        subject: giftogramConfig?.subject || batch.giftogramSubject || "You have received a gift card!",
        notes: giftogramConfig?.notes || `Gift card for ${payment.recipientName}`,
        campaignId: giftogramConfig?.campaignId || batch.giftogramCampaignId,
      };

      const result = await giftogramService.createGiftCardOrder(order);

      sentCount++;
      const success = result.success && result.data;
      let recipientStatus = null;
      if (success) {
        successCount++;
        const orderId = result.data.data?.order_id || result.data.order_id || result.data.id;
        recipientStatus = result.data.data?.recipients?.[0]?.status || result.data.recipients?.[0]?.status;
        const paymentStatus = recipientStatus === "sent" ? "completed" : "processing";
        await payment.updateStatus(paymentStatus, {
          giftogramOrderId: orderId,
          giftogramCampaignId: giftogramConfig?.campaignId || batch.giftogramCampaignId,
          giftogramMessage: giftogramConfig?.message || batch.giftogramMessage,
          giftogramSubject: giftogramConfig?.subject || batch.giftogramSubject,
          giftogramStatus: result.data.data?.status || result.data.status,
        });
      } else {
        failCount++;
        await payment.updateStatus("failed", {
          errorMessage: result.error || "Unknown error",
          completedAt: new Date(),
        });
      }

      const paymentStatus = success
        ? (recipientStatus === "sent" ? "completed" : "processing")
        : "failed";

      sendEvent({
        sent: sentCount,
        total,
        success,
        paymentId: payment._id.toString(),
        email: payment.recipientEmail,
        status: paymentStatus,
        errorMessage: success ? null : (result.error || "Unknown error"),
      });
    }

    await batch.updateCounts();
    const allFailed = successCount === 0 && failCount > 0;
    batch.status = allFailed ? "failed" : "completed";
    if (allFailed && payments.length > 0) {
      const firstFailed = payments.find((p) => p.status === "failed");
      batch.errorMessage = firstFailed?.errorMessage || "All gift card orders failed";
    }
    await batch.save();

    sendEvent({
      done: true,
      sent: sentCount,
      total,
      successful: successCount,
      failed: failCount,
      hasFailures: failCount > 0,
    });
  } catch (error) {
    console.error("Error in streaming Giftogram processing:", error);
    sendEvent({
      done: true,
      error: error.message,
      sent: sentCount,
      total,
      successful: successCount,
      failed: failCount,
    });
    batch.status = "failed";
    batch.errorMessage = error.message;
    await batch.save();
  } finally {
    res.end();
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
    const environment = batch.environment || "sandbox";
    const giftogramService = getGiftogramService(environment);
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

          // Extract recipient status from nested response structure
          const responseData = result.data.data || result.data;
          const recipientStatus = responseData.recipients?.[0]?.status;
          const orderStatus = responseData.status || result.data.status;

          // Check recipient status first - "sent" means completed
          if (recipientStatus === "sent") {
            newStatus = "completed";
          } else if (recipientStatus === "pending") {
            newStatus = "processing";
          } else {
            // Fallback to order status mapping if recipient status not available
            if (orderStatus === "delivered" || orderStatus === "sent") {
              newStatus = "completed";
            } else if (orderStatus === "failed" || orderStatus === "cancelled") {
              newStatus = "failed";
            } else if (orderStatus === "processing" || orderStatus === "pending") {
              newStatus = "processing";
            }
          }

          if (newStatus !== oldStatus) {
            await payment.updateStatus(newStatus, {
              giftogramStatus: orderStatus,
            });
            console.log(`Updated payment ${payment._id} status from ${oldStatus} to ${newStatus}`, {
              recipientStatus,
              orderStatus,
            });
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
  let environment = req.query.environment || req.body.environment || "sandbox";
  
  // Normalize environment (trim whitespace, lowercase)
  environment = String(environment).trim().toLowerCase();
  
  // Validate environment - default to sandbox if invalid
  if (!["production", "sandbox"].includes(environment)) {
    console.warn(`Invalid environment value received: "${req.query.environment || req.body.environment}", defaulting to sandbox`);
    environment = "sandbox";
  }

  console.log(`💰 Fetching Giftogram funding balance (environment: ${environment})`);

  try {
    const giftogramService = getGiftogramService(environment);
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
  let environment = req.query.environment || req.body.environment || "sandbox";
  
  // Normalize environment (trim whitespace, lowercase)
  environment = String(environment).trim().toLowerCase();
  
  // Validate environment - default to sandbox if invalid
  if (!["production", "sandbox"].includes(environment)) {
    console.warn(`Invalid environment value received: "${req.query.environment || req.body.environment}", defaulting to sandbox`);
    environment = "sandbox";
  }

  console.log(`🧪 Testing Giftogram API connection (environment: ${environment})`);

  try {
    const giftogramService = getGiftogramService(environment);
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
  processGiftogramBatchStream,
  syncGiftogramBatch,
  getGiftogramFunding,
  testGiftogramConnection,
};
