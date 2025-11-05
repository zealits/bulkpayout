const asyncHandler = require("../middleware/asyncHandler");
const Payment = require("../models/Payment");
const PaymentBatch = require("../models/PaymentBatch");
const { parseExcelFile, validatePaymentData, generateValidationReport } = require("../utils/excelParser");
const { successResponse, errorResponse, validationErrorResponse } = require("../utils/responseHelper");

// @desc    Upload and parse Excel file
// @route   POST /api/upload/excel
// @access  Public
const uploadExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, "No file uploaded", 400);
  }

  const { buffer, originalname, size } = req.file;
  const { batchName, description, environment } = req.body;

  // Validate environment, default to sandbox
  const env = environment === "production" ? "production" : "sandbox";

  // Parse the Excel file
  const parseResult = parseExcelFile(buffer, originalname);

  if (!parseResult.success) {
    return errorResponse(res, `Failed to parse file: ${parseResult.error}`, 400);
  }

  // Validate payment data
  const validationResult = validatePaymentData(parseResult.data);
  const validationReport = generateValidationReport(validationResult);

  if (!validationReport.isValid) {
    return validationErrorResponse(res, validationReport.errors, "File contains validation errors");
  }

  try {
    // Generate batch ID
    const batchId = PaymentBatch.generateBatchId();

    // Create payment batch
    const batch = new PaymentBatch({
      batchId,
      name: batchName || `Batch ${new Date().toLocaleDateString()}`,
      description: description || `Uploaded from ${originalname}`,
      totalPayments: validationResult.validCount,
      totalAmount: validationReport.summary.totalAmount,
      originalFileName: originalname,
      fileSize: size,
      status: "uploaded",
      ipAddress: req.ip,
      environment: env,
    });

    await batch.save();

    // Create individual payments
    const payments = validationResult.validPayments.map((payment) => ({
      ...payment,
      batchId,
      createdBy: "upload",
      ipAddress: req.ip,
      environment: env,
    }));

    await Payment.insertMany(payments);

    // Update batch counts
    await batch.updateCounts();

    const response = {
      batch,
      validationReport,
      payments: payments.length,
    };

    successResponse(res, response, "File uploaded and processed successfully", 201);
  } catch (error) {
    console.error("Error saving payment data:", error);
    return errorResponse(res, "Failed to save payment data", 500);
  }
});

// @desc    Validate Excel file without saving
// @route   POST /api/upload/validate
// @access  Public
const validateExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, "No file uploaded", 400);
  }

  const { buffer, originalname } = req.file;

  // Parse the Excel file
  const parseResult = parseExcelFile(buffer, originalname);

  if (!parseResult.success) {
    return errorResponse(res, `Failed to parse file: ${parseResult.error}`, 400);
  }

  // Validate payment data
  const validationResult = validatePaymentData(parseResult.data);
  const validationReport = generateValidationReport(validationResult);

  const response = {
    filename: originalname,
    validationReport,
    preview: validationResult.validPayments.slice(0, 10), // First 10 valid payments for preview
  };

  if (validationReport.isValid) {
    return successResponse(res, response, "File validation completed successfully");
  } else {
    // Always return success response but with validation errors for frontend to handle
    return successResponse(res, response, `File contains ${validationReport.errors.length} validation error(s)`);
  }
});

// @desc    Get upload template
// @route   GET /api/upload/template
// @access  Public
const getUploadTemplate = asyncHandler(async (req, res) => {
  const template = {
    headers: ["name", "email", "amount", "notes", "currency"],
    sampleData: [
      {
        name: "John Doe",
        email: "john@example.com",
        amount: 150.0,
        notes: "Freelance work payment",
        currency: "USD",
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        amount: 75,
        notes: "Consultation fee",
        currency: "USD",
      },
      {
        name: "Bob Johnson",
        email: "bob@example.com",
        amount: 200.0,
        notes: "Project milestone payment",
        currency: "USD",
      },
    ],
    requirements: {
      name: "Recipient full name (required, min 2 characters)",
      email: "Valid email address (required)",
      amount: "Payment amount (required, > 0, max $10,000)",
      notes: "Optional payment description",
      currency: "Currency code (optional, default: USD)",
    },
    supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
    maxFileSize: "10MB",
    supportedFormats: [".xlsx", ".xls", ".csv"],
  };

  successResponse(res, template, "Upload template retrieved successfully");
});

// @desc    Delete uploaded batch
// @route   DELETE /api/upload/batches/:batchId
// @access  Public
const deleteUploadedBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  const batch = await PaymentBatch.findOne({ batchId });
  if (!batch) {
    return errorResponse(res, "Batch not found", 404);
  }

  // Check if batch has been processed
  if (batch.status === "processing" || batch.status === "completed") {
    return errorResponse(res, "Cannot delete processed batch", 400);
  }

  // Delete all payments in the batch
  await Payment.deleteMany({ batchId });

  // Delete the batch
  await PaymentBatch.deleteOne({ batchId });

  successResponse(res, null, "Batch deleted successfully");
});

// @desc    Update batch information
// @route   PUT /api/upload/batches/:batchId
// @access  Public
const updateBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { name, description } = req.body;

  const batch = await PaymentBatch.findOne({ batchId });
  if (!batch) {
    return errorResponse(res, "Batch not found", 404);
  }

  // Check if batch has been processed
  if (batch.status === "processing" || batch.status === "completed") {
    return errorResponse(res, "Cannot update processed batch", 400);
  }

  // Update batch information
  if (name) batch.name = name;
  if (description) batch.description = description;

  await batch.save();

  successResponse(res, batch, "Batch updated successfully");
});

module.exports = {
  uploadExcel,
  validateExcel,
  getUploadTemplate,
  deleteUploadedBatch,
  updateBatch,
};
