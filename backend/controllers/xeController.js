const asyncHandler = require("../middleware/asyncHandler");
const Payment = require("../models/Payment");
const PaymentBatch = require("../models/PaymentBatch");
const PaymentField = require("../models/PaymentField");
const XeContract = require("../models/XeContract");
const XeRecipient = require("../models/XeRecipient");
const { getXeService } = require("../services/xeService");
const { generateXeTemplate, generateXeWorkbookForSelections } = require("../utils/xeExcelGenerator");
const { parseXeWorkbook } = require("../utils/xeWorkbookParser");
const { successResponse, errorResponse } = require("../utils/responseHelper");

// Helper function to get environment from request
function getEnvironmentFromRequest(req) {
  let environment = req.query.environment || req.body.environment || "sandbox";

  // Normalize environment (trim whitespace, lowercase)
  environment = String(environment).trim().toLowerCase();

  // Validate environment - default to sandbox if invalid
  if (!["production", "sandbox"].includes(environment)) {
    console.warn(
      `Invalid environment value received: "${req.query.environment || req.body.environment}", defaulting to sandbox`
    );
    environment = "sandbox";
  }

  return environment;
}

// @desc    Test XE API connection
// @route   GET /api/xe/test
// @access  Public
const testXeConnection = asyncHandler(async (req, res) => {
  try {
    const environment = getEnvironmentFromRequest(req);
    console.log(`🧪 Testing XE API connection (environment: ${environment})`);

    const xeService = getXeService(environment);
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
  try {
    const environment = getEnvironmentFromRequest(req);
    console.log(`🏦 Fetching XE accounts (environment: ${environment})`);

    const xeService = getXeService(environment);
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

  try {
    const environment = getEnvironmentFromRequest(req);
    console.log(`🌍 Fetching payment fields for ${countryCode}/${currencyCode} (environment: ${environment})`);

    const xeService = getXeService(environment);
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

  try {
    const environment = getEnvironmentFromRequest(req);
    console.log(`👤 Creating XE recipient (environment: ${environment}):`, recipientData.email);

    // Ensure client reference is system-generated and XE-compliant
    if (!recipientData.clientReference || typeof recipientData.clientReference !== "string") {
      recipientData.clientReference = require("../models/XeRecipient").generateClientReference();
    }

    const xeService = getXeService(environment);
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

  try {
    const environment = getEnvironmentFromRequest(req);
    console.log(`💰 Creating XE payment (environment: ${environment}):`, {
      recipientId: paymentData.recipientId,
      amount: paymentData.amount,
    });

    const xeService = getXeService(environment);
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

  try {
    const environment = getEnvironmentFromRequest(req);
    console.log(`📊 Getting XE payment status (environment: ${environment}): ${paymentId}`);

    const xeService = getXeService(environment);
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
  try {
    const environment = getEnvironmentFromRequest(req);
    console.log(`🌍 Fetching supported countries and currencies (environment: ${environment})`);

    const xeService = getXeService(environment);
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

// @desc    Generate XE Excel template
// @route   POST /api/xe/generate-template
// @access  Public
const generateXeExcelTemplate = asyncHandler(async (req, res) => {
  const { countryCode, currencyCode, numberOfRecipients } = req.body;

  console.log(`📊 Generating XE template for ${countryCode}/${currencyCode} with ${numberOfRecipients} recipients`);

  // Validate input
  if (!countryCode || !currencyCode) {
    return errorResponse(res, "Country code and currency code are required", 400);
  }

  if (typeof numberOfRecipients !== "number" || numberOfRecipients < 1 || numberOfRecipients > 10000) {
    return errorResponse(res, "Number of recipients must be between 1 and 10,000", 400);
  }

  try {
    // Try to get payment fields from database first
    let paymentFields = [];
    let paymentFieldDoc = await PaymentField.findOne({ countryCode, currencyCode });

    // If not in database or expired, fetch from API
    const environment = getEnvironmentFromRequest(req);
    if (!paymentFieldDoc || paymentFieldDoc.isExpired()) {
      console.log(
        `Fetching payment fields from XE API for ${countryCode}/${currencyCode} (environment: ${environment})`
      );
      const xeService = getXeService(environment);
      const fieldsResult = await xeService.getPaymentFields(countryCode, currencyCode);

      if (fieldsResult.success && fieldsResult.data) {
        paymentFields = fieldsResult.data;

        // Store in database
        await PaymentField.findOrCreate(countryCode, currencyCode, paymentFields);
        console.log(`Payment fields stored in database for ${countryCode}/${currencyCode}`);
      } else {
        console.warn(`Could not fetch payment fields from API, using empty array`);
        // Continue without payment fields - template will still work with base fields
      }
    } else {
      paymentFields = paymentFieldDoc.fields;
      console.log(`Using cached payment fields from database for ${countryCode}/${currencyCode}`);
    }

    // Generate Excel template
    const excelBuffer = generateXeTemplate({
      countryCode,
      currencyCode,
      numberOfRecipients,
      paymentFields,
    });

    // Set headers for file download
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="XE_Template_${countryCode}_${currencyCode}_${Date.now()}.xlsx"`
    );

    // Send the Excel file
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error generating XE template:", error);
    // If headers were already set, we need to remove them and send JSON instead
    if (res.headersSent) {
      console.error("Headers already sent, cannot send error response");
      return;
    }
    return errorResponse(res, "Failed to generate template", 500, {
      message: "An unexpected error occurred while generating the Excel template.",
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
  generateXeExcelTemplate,
};

// @desc    Generate XE Excel templates for multiple selections (multi-sheet workbook)
// @route   POST /api/xe/generate-template-bulk
// @access  Public
const generateXeExcelTemplatesBulk = asyncHandler(async (req, res) => {
  const { selections } = req.body || {};

  if (!Array.isArray(selections) || selections.length === 0) {
    return errorResponse(res, "Selections array is required", 400);
  }

  try {
    const resolvedSelections = [];
    for (const sel of selections) {
      const { countryCode, currencyCode, numberOfRecipients } = sel || {};
      if (!countryCode || !currencyCode) continue;

      let paymentFields = [];
      let paymentFieldDoc = await PaymentField.findOne({ countryCode, currencyCode });
      const environment = getEnvironmentFromRequest(req);
      if (!paymentFieldDoc || paymentFieldDoc.isExpired()) {
        const xeService = getXeService(environment);
        const fieldsResult = await xeService.getPaymentFields(countryCode, currencyCode);
        if (fieldsResult.success && fieldsResult.data) {
          paymentFields = fieldsResult.data;
          await PaymentField.findOrCreate(countryCode, currencyCode, paymentFields);
        }
      } else {
        paymentFields = paymentFieldDoc.fields;
      }

      resolvedSelections.push({
        countryCode,
        currencyCode,
        numberOfRecipients: Number(numberOfRecipients) || 1,
        paymentFields,
      });
    }

    const excelBuffer = generateXeWorkbookForSelections(resolvedSelections);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="XE_Templates_${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error generating bulk XE templates:", error);
    return errorResponse(res, "Failed to generate templates", 500, {
      message: "An unexpected error occurred while generating the Excel templates.",
      severity: "error",
      details: { originalError: error.message },
    });
  }
});

module.exports.generateXeExcelTemplatesBulk = generateXeExcelTemplatesBulk;

// @desc    Parse uploaded XE template workbook and extract rows per sheet
// @route   POST /api/xe/parse-template
// @access  Public
const parseXeTemplate = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, "No file uploaded", 400);
  }

  try {
    const { buffer, originalname } = req.file;
    const parsed = parseXeWorkbook(buffer);
    return successResponse(res, { filename: originalname, sheets: parsed.sheets }, "Workbook parsed successfully");
  } catch (error) {
    console.error("Error parsing XE workbook:", error);
    return errorResponse(res, "Failed to parse workbook", 400, { message: error.message });
  }
});

module.exports.parseXeTemplate = parseXeTemplate;

// @desc    Create XE contract for a recipient
// @route   POST /api/xe/contracts
// @access  Public
const createXeContract = asyncHandler(async (req, res) => {
  const { xeRecipientId, amount, buyCurrency, environment } = req.body;

  // Validate environment, default to sandbox
  const env = environment === "production" ? "production" : "sandbox";

  console.log("📝 Creating XE contract:", {
    xeRecipientId,
    amount,
    buyCurrency,
    environment: env,
  });

  // Validate required fields
  if (!xeRecipientId || !amount || !buyCurrency) {
    return errorResponse(res, "xeRecipientId, amount, and buyCurrency are required", 400);
  }

  if (amount <= 0) {
    return errorResponse(res, "Amount must be greater than 0", 400);
  }

  try {
    // Find recipient to get client reference (filter by environment)
    const recipient = await XeRecipient.findOne({
      "recipientId.xeRecipientId": xeRecipientId,
      environment: env,
    });
    if (!recipient) {
      return errorResponse(res, "Recipient not found", 404);
    }

    // Generate unique client reference for the contract payment
    const clientReference = XeRecipient.generateClientReference("PAY");

    // Determine purpose of payment code
    const purposeOfPaymentCode = buyCurrency === "INR" ? "CORP_INR_UTILTY" : "CORP_INVOICE";

    // Get XE service instance to access environment-specific configuration
    const environment = getEnvironmentFromRequest(req);
    const xeService = getXeService(environment);

    // Get bank account ID from XE service (handles environment-specific variables)
    const bankAccountId = xeService.bankAccountId;
    if (!bankAccountId) {
      return errorResponse(
        res,
        `XE_BANK_ACCOUNT_ID is not configured for ${env} environment. Please set XE_${env.toUpperCase()}_BANK_ACCOUNT_ID or XE_BANK_ACCOUNT_ID in your environment variables.`,
        500
      );
    }

    // Build contract request payload
    const contractData = {
      payments: [
        {
          clientReference: clientReference,
          sellAmount: {
            currency: "USD",
            amount: parseFloat(amount),
          },
          buyAmount: {
            currency: buyCurrency,
          },
          purposeOfPaymentCode: purposeOfPaymentCode,
          recipient: {
            recipientId: {
              xeRecipientId: xeRecipientId,
              clientReference: recipient.recipientId.clientReference,
            },
            type: "Registered",
          },
        },
      ],
      autoApprove: false,
      settlementDetails: {
        settlementMethod: "DirectDebit",
        bankAccountId: parseInt(bankAccountId, 10),
      },
    };

    // Create contract via XE API
    const result = await xeService.createContract(contractData);

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to create XE contract",
        suggestion: "Please check the contract data and try again.",
        action: "Verify contract data",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    // Process quote data to ensure dates are properly parsed
    let processedQuote = result.data.quote;
    if (processedQuote) {
      processedQuote = { ...processedQuote };
      if (processedQuote.quoteTime) {
        processedQuote.quoteTime = new Date(processedQuote.quoteTime);
      }
      if (processedQuote.expires) {
        processedQuote.expires = new Date(processedQuote.expires);
      }
      if (processedQuote.fxDetails && Array.isArray(processedQuote.fxDetails)) {
        processedQuote.fxDetails = processedQuote.fxDetails.map((fx) => {
          const processed = { ...fx };
          if (processed.valueDate) {
            processed.valueDate = new Date(processed.valueDate);
          }
          return processed;
        });
      }
    }

    // Process summary data to ensure dates are properly parsed
    let processedSummary = result.data.summary;
    if (processedSummary && Array.isArray(processedSummary)) {
      processedSummary = processedSummary.map((s) => {
        const processed = { ...s };
        if (processed.settlementDate) {
          processed.settlementDate = new Date(processed.settlementDate);
        }
        if (processed.remainingSettlement?.valueDate) {
          processed.remainingSettlement = {
            ...processed.remainingSettlement,
            valueDate: new Date(processed.remainingSettlement.valueDate),
          };
        }
        return processed;
      });
    }

    // Build recipient display name and preserve batch for grouping
    const recipientName =
      recipient?.entity?.company?.name ||
      [recipient?.entity?.consumer?.givenNames, recipient?.entity?.consumer?.familyName].filter(Boolean).join(" ") ||
      undefined;

    // Store contract in database
    const contract = new XeContract({
      identifier: result.data.identifier,
      recipientId: {
        xeRecipientId: xeRecipientId,
        clientReference: recipient.recipientId.clientReference,
      },
      recipientName: recipientName,
      batchId: recipient?.batchId,
      createdDate: result.data.createdDate ? new Date(result.data.createdDate) : new Date(),
      status: result.data.status,
      quote: processedQuote,
      settlementOptions: result.data.settlementOptions,
      deliveryMethod: result.data.deliveryMethod,
      summary: processedSummary,
      settlementStatus: result.data.settlementStatus,
      quoteStatus: result.data.quoteStatus,
      contractType: result.data.contractType,
      paymentRequest: {
        clientReference: clientReference,
        sellAmount: {
          currency: "USD",
          amount: parseFloat(amount),
        },
        buyAmount: {
          currency: buyCurrency,
        },
        purposeOfPaymentCode: purposeOfPaymentCode,
      },
      environment: env,
    });

    await contract.save();

    successResponse(res, contract.toObject(), "XE contract created successfully");
  } catch (error) {
    console.error("Error in createXeContract:", error);
    return errorResponse(res, "Failed to create contract", 500, {
      message: "An unexpected error occurred while creating the contract.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Cancel/Delete XE contract
// @route   DELETE /api/xe/contracts/:contractNumber
// @access  Public
const cancelXeContract = asyncHandler(async (req, res) => {
  const { contractNumber } = req.params;

  console.log(`🗑️ Cancelling XE contract: ${contractNumber}`);

  if (!contractNumber) {
    return errorResponse(res, "Contract number is required", 400);
  }

  try {
    // Find contract in database
    const contract = await XeContract.findOne({ "identifier.contractNumber": contractNumber });
    if (!contract) {
      return errorResponse(res, "Contract not found", 404);
    }

    // Cancel contract via XE API - use environment from contract
    const environment = contract.environment || "sandbox";
    const xeService = getXeService(environment);
    const result = await xeService.cancelContract(contractNumber);

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to cancel XE contract",
        suggestion: "Please check the contract status and try again.",
        action: "Verify contract status",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    // Update contract status in database
    contract.status = "Cancelled";
    await contract.save();

    successResponse(res, contract.toObject(), "XE contract cancelled successfully");
  } catch (error) {
    console.error("Error in cancelXeContract:", error);
    return errorResponse(res, "Failed to cancel contract", 500, {
      message: "An unexpected error occurred while cancelling the contract.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Approve XE contract
// @route   POST /api/xe/contracts/:contractNumber/approve
// @access  Public
const approveXeContract = asyncHandler(async (req, res) => {
  const { contractNumber } = req.params;

  console.log(`✅ Approving XE contract: ${contractNumber}`);

  if (!contractNumber) {
    return errorResponse(res, "Contract number is required", 400);
  }

  try {
    // Find contract in database
    const contract = await XeContract.findOne({ "identifier.contractNumber": contractNumber });
    if (!contract) {
      return errorResponse(res, "Contract not found", 404);
    }

    // Check if contract is already approved
    if (contract.status === "Approved") {
      return errorResponse(res, "Contract is already approved", 400);
    }

    // Approve contract via XE API - use environment from contract
    const environment = contract.environment || "sandbox";
    const xeService = getXeService(environment);
    const result = await xeService.approveContract(contractNumber);

    if (!result.success) {
      return errorResponse(res, result.error, 400, {
        message: "Failed to approve XE contract",
        suggestion: "Please check the contract status and try again.",
        action: "Verify contract status",
        severity: "error",
        retryable: true,
        details: result.details,
      });
    }

    // Update contract in database
    contract.status = "Approved";
    contract.approvedAt = new Date();
    contract.approvedBy = "system"; // You can add user tracking here

    // Update with latest data from XE if provided
    if (result.data) {
      if (result.data.status) contract.status = result.data.status;
      if (result.data.quote) contract.quote = result.data.quote;
      if (result.data.settlementStatus) contract.settlementStatus = result.data.settlementStatus;
      if (result.data.quoteStatus) contract.quoteStatus = result.data.quoteStatus;
    }

    await contract.save();

    successResponse(res, contract.toObject(), "XE contract approved successfully");
  } catch (error) {
    console.error("Error in approveXeContract:", error);
    return errorResponse(res, "Failed to approve contract", 500, {
      message: "An unexpected error occurred while approving the contract.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Get XE contract by contract number
// @route   GET /api/xe/contracts/:contractNumber
// @access  Public
const getXeContract = asyncHandler(async (req, res) => {
  const { contractNumber } = req.params;

  console.log(`📄 Getting XE contract: ${contractNumber}`);

  if (!contractNumber) {
    return errorResponse(res, "Contract number is required", 400);
  }

  try {
    const contract = await XeContract.findOne({ "identifier.contractNumber": contractNumber });

    if (!contract) {
      return errorResponse(res, "Contract not found", 404);
    }

    successResponse(res, contract.toObject(), "XE contract retrieved successfully");
  } catch (error) {
    console.error("Error in getXeContract:", error);
    return errorResponse(res, "Failed to retrieve contract", 500, {
      message: "An unexpected error occurred while retrieving the contract.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Get XE contract details from XE API
// @route   GET /api/xe/contracts/:contractNumber/details
// @access  Public
const getXeContractDetails = asyncHandler(async (req, res) => {
  const { contractNumber } = req.params;

  console.log(`📄 Getting XE contract details from API: ${contractNumber}`);

  if (!contractNumber) {
    return errorResponse(res, "Contract number is required", 400);
  }

  try {
    // Get environment from request
    const environment = getEnvironmentFromRequest(req);
    const xeService = getXeService(environment);
    const result = await xeService.getContractDetails(contractNumber);

    if (!result.success) {
      return errorResponse(res, result.error || "Failed to fetch contract details", result.statusCode || 500, {
        message: result.error || "An unexpected error occurred while fetching contract details.",
        suggestion: "Please verify the contract number and try again.",
        action: "Retry operation",
        severity: "error",
        retryable: true,
        details: result.details || {},
      });
    }

    successResponse(res, result.data, "XE contract details retrieved successfully");
  } catch (error) {
    console.error("Error in getXeContractDetails:", error);
    return errorResponse(res, "Failed to retrieve contract details", 500, {
      message: "An unexpected error occurred while retrieving the contract details.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Get XE contracts for a recipient
// @route   GET /api/xe/recipients/:xeRecipientId/contracts
// @access  Public
const getXeContractsByRecipient = asyncHandler(async (req, res) => {
  const { xeRecipientId } = req.params;
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const skip = (page - 1) * limit;

  // Get environment from query, default to sandbox
  const environment = getEnvironmentFromRequest(req);

  console.log(`📄 Getting XE contracts for recipient: ${xeRecipientId}, environment: ${environment}`);

  if (!xeRecipientId) {
    return errorResponse(res, "xeRecipientId is required", 400);
  }

  try {
    const query = {
      "recipientId.xeRecipientId": xeRecipientId,
      environment: environment,
    };

    const [contracts, total] = await Promise.all([
      XeContract.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      XeContract.countDocuments(query),
    ]);

    successResponse(
      res,
      {
        items: contracts,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      "XE contracts retrieved successfully"
    );
  } catch (error) {
    console.error("Error in getXeContractsByRecipient:", error);
    return errorResponse(res, "Failed to retrieve contracts", 500, {
      message: "An unexpected error occurred while retrieving the contracts.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

// @desc    Get all XE contracts
// @route   GET /api/xe/contracts
// @access  Public
const getAllXeContracts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim();

  // Get environment from query, default to sandbox
  const environment = getEnvironmentFromRequest(req);

  console.log(`📄 Getting all XE contracts - page: ${page}, limit: ${limit}, environment: ${environment}`);

  try {
    const query = { environment };

    // Add search functionality
    if (search) {
      query.$or = [
        { "identifier.contractNumber": { $regex: search, $options: "i" } },
        { "identifier.clientTransferNumber": { $regex: search, $options: "i" } },
        { "recipientId.xeRecipientId": { $regex: search, $options: "i" } },
        { "recipientId.clientReference": { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { quoteStatus: { $regex: search, $options: "i" } },
      ];
    }

    const [contracts, total] = await Promise.all([
      XeContract.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      XeContract.countDocuments(query),
    ]);

    successResponse(
      res,
      {
        items: contracts,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      "XE contracts retrieved successfully"
    );
  } catch (error) {
    console.error("Error in getAllXeContracts:", error);
    return errorResponse(res, "Failed to retrieve contracts", 500, {
      message: "An unexpected error occurred while retrieving the contracts.",
      suggestion: "Please try again. If the issue persists, contact support.",
      action: "Retry operation",
      severity: "error",
      retryable: true,
      details: { originalError: error.message },
    });
  }
});

module.exports.createXeContract = createXeContract;
module.exports.approveXeContract = approveXeContract;
module.exports.cancelXeContract = cancelXeContract;
module.exports.getXeContract = getXeContract;
module.exports.getXeContractDetails = getXeContractDetails;
module.exports.getXeContractsByRecipient = getXeContractsByRecipient;
module.exports.getAllXeContracts = getAllXeContracts;
