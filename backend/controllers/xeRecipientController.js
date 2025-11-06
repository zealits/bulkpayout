const asyncHandler = require("../middleware/asyncHandler");
const XeRecipient = require("../models/XeRecipient");
const { getXeService } = require("../services/xeService");
const { successResponse, errorResponse } = require("../utils/responseHelper");

/**
 * Transform Excel row data to XE API format
 */
function transformRowToXeRecipient(row, sheetInfo = {}) {
  // Normalize keys (handle variations)
  const normalizeKey = (key) => {
    return key
      ?.toString()
      .toLowerCase()
      .replace(/\*/g, "")
      .replace(/\s*\(.*?\)\s*/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const getValue = (keys) => {
    for (const key of keys) {
      const normalized = normalizeKey(key);
      const value = row[normalized] || row[key] || "";
      if (value) return value.toString().trim();
    }
    return "";
  };

  // Ensure numeric identifiers typed with quotes/backticks keep digits and leading zeros
  const cleanNumericString = (value) => {
    if (value == null) return "";
    const str = value.toString().trim();
    // Remove any non-digit characters while preserving order, e.g. "`021000021" => "021000021"
    return str.replace(/[^0-9]/g, "");
  };

  // For NCC/clearing code sanitization: keep alphanumeric for all countries (handles IFSC/IBAN-like codes)
  const sanitizeNcc = (value, countryCode) => {
    if (value == null) return "";
    const str = value.toString().trim();
    // Keep only letters and digits, remove spaces and punctuation, uppercase for consistency
    return str.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  };

  // Extract consumer data
  const givenNames = getValue(["given names", "givenNames", "given_names"]);
  const familyName = getValue(["family name", "familyName", "family_name"]);
  const emailAddress = getValue(["email address", "emailAddress", "email_address", "email"]);

  // Extract address data
  const addressLine1 = getValue(["address line 1", "addressLine1", "address_line_1"]);
  const addressLine2 = getValue(["address line 2", "addressLine2", "address_line_2"]);
  const addressCountry = getValue(["address country", "addressCountry", "address_country", "country"]);
  const locality = getValue(["locality", "locality city", "city"]);
  const region = getValue(["region", "region state province", "state", "province"]);
  const postcode = getValue(["postcode", "postal code", "postal_code", "zipcode", "zip"]);

  // Extract bank account data
  const accountName = getValue(["account name", "accountName", "account_name"]);
  const bankCountry = getValue(["bank country", "bankCountry", "bank_country"]);
  const accountType = getValue(["account type", "accountType", "account_type"]);
  const accountNumber = getValue(["account number", "accountNumber", "account_number"]);
  const bic = getValue(["bic", "swift", "swift_code"]);
  const ncc = getValue(["ncc", "ifsc", "routing_number", "routing number"]);
  const iban = getValue(["iban"]);

  // Extract currency (from sheet info or row)
  const currency = sheetInfo.inferredCurrency || getValue(["currency"]) || "";

  // Extract amount (USD) - dollars only
  const amountStr = getValue(["amount (usd)", "amount", "amount_usd", "usd_amount"]);
  const amount = amountStr ? parseFloat(amountStr) : null;

  // Build XE API request body
  const recipientData = {
    payoutMethod: {
      type: "BankAccount",
      bank: {
        account: {},
      },
    },
    entity: {
      type: "Consumer",
      consumer: {
        givenNames: givenNames,
        familyName: familyName,
        emailAddress: emailAddress,
        address: {
          line1: addressLine1 || "",
          line2: addressLine2 || "",
          country: addressCountry || "",
          locality: locality || "",
          region: region || "",
          postcode: postcode || "",
        },
      },
      isDeactivated: false,
    },
    currency: currency,
  };

  // Add bank account fields
  if (accountName) recipientData.payoutMethod.bank.account.accountName = accountName;
  if (accountNumber) recipientData.payoutMethod.bank.account.accountNumber = accountNumber;
  if (bankCountry) recipientData.payoutMethod.bank.account.country = bankCountry;
  if (accountType) recipientData.payoutMethod.bank.account.accountType = accountType;
  if (bic) recipientData.payoutMethod.bank.account.bic = bic;
  if (ncc) recipientData.payoutMethod.bank.account.ncc = sanitizeNcc(ncc, bankCountry);
  if (iban) recipientData.payoutMethod.bank.account.iban = iban;

  return {
    recipientData,
    accountNumber,
    amount,
    extractedData: {
      givenNames,
      familyName,
      emailAddress,
      address: {
        line1: addressLine1,
        line2: addressLine2,
        country: addressCountry,
        locality,
        region,
        postcode,
      },
      bank: {
        accountName,
        accountNumber,
        country: bankCountry,
        accountType,
        bic,
        ncc: sanitizeNcc(ncc, bankCountry),
        iban,
      },
      currency,
      amount,
    },
  };
}

// Helper function to send SSE message
const sendSSE = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

// @desc    Create XE recipients from uploaded Excel data
// @route   POST /api/xe/create-recipients
// @access  Public
const createXeRecipients = asyncHandler(async (req, res) => {
  const { sheetRows, batchId, environment, useSSE } = req.body; // Array of { sheetName, rows, inferredCountry, inferredCurrency }
  
  // Validate environment, default to sandbox
  const env = environment === "production" ? "production" : "sandbox";
  console.log(`🌍 Creating XE recipients in ${env} environment (received: ${environment})`);

  if (!Array.isArray(sheetRows) || sheetRows.length === 0) {
    return errorResponse(res, "sheetRows array is required", 400);
  }

  // Check if client wants SSE (Server-Sent Events) for progress updates
  if (useSSE) {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Send initial connection message
    sendSSE(res, "connected", { message: "Connected to recipient creation stream" });
  }

  const results = [];
  const errors = [];
  let totalRows = 0;
  let processedCount = 0;

  // Count total rows first
  for (const sheetInfo of sheetRows) {
    if (Array.isArray(sheetInfo.rows)) {
      totalRows += sheetInfo.rows.length;
    }
  }

  // Generate a batch id if not supplied by caller
  const makeBatchId = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const y = now.getUTCFullYear().toString().slice(-2);
    const M = pad(now.getUTCMonth() + 1);
    const d = pad(now.getUTCDate());
    const h = pad(now.getUTCHours());
    const m = pad(now.getUTCMinutes());
    const s = pad(now.getUTCSeconds());
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let rand = "";
    for (let i = 0; i < 4; i++) rand += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `BATCH-${y}${M}${d}${h}${m}${s}-${rand}`;
  };

  const effectiveBatchId = batchId || makeBatchId();

  if (useSSE) {
    sendSSE(res, "start", { totalRows, batchId: effectiveBatchId });
  }

  for (const sheetInfo of sheetRows) {
    const { sheetName, rows, inferredCountry, inferredCurrency } = sheetInfo;

    if (!Array.isArray(rows) || rows.length === 0) continue;

    for (const row of rows) {
      try {
        // Generate unique client reference
        let clientReference = XeRecipient.generateClientReference();

        // Transform row to XE format
        const { recipientData, accountNumber, amount, extractedData } = transformRowToXeRecipient(row, {
          inferredCountry,
          inferredCurrency,
        });

        // Add client reference
        recipientData.clientReference = clientReference;

        // Check if clientReference already exists
        let existingRecipient = await XeRecipient.findOne({ clientReference });
        let attempts = 0;
        while (existingRecipient && attempts < 10) {
          clientReference = XeRecipient.generateClientReference();
          existingRecipient = await XeRecipient.findOne({ clientReference });
          attempts++;
        }

        recipientData.clientReference = clientReference;

        // Create recipient in XE API (use env-configured XE account number)
        console.log("👤 recipientData:", recipientData);
        console.log("🏦 recipientData.payoutMethod.bank.account:", recipientData?.payoutMethod?.bank?.account);
        const xeService = getXeService(env);
        const apiResult = await xeService.createRecipient(recipientData);
        // console.log("📦 apiResult:", apiResult);
        // console.log("📄 apiResult.data:", apiResult?.data);

        processedCount++;

        if (apiResult.success && apiResult.statusCode === 200 && apiResult.data) {
          // Persist only the successful response fields
          // Shape expected by schema: { payoutMethod, entity, recipientId, currency, amount }
          const toSave = {
            payoutMethod: apiResult.data.payoutMethod,
            entity: apiResult.data.entity,
            recipientId: apiResult.data.recipientId,
            currency: apiResult.data.currency,
            amount: amount && !isNaN(amount) && amount > 0 ? amount : undefined,
            batchId: effectiveBatchId,
            environment: env,
          };

          console.log("📝 xeRecipient (success, to be saved):", toSave);
          const xeRecipient = new XeRecipient(toSave);
          await xeRecipient.save();

          const result = {
            clientReference: apiResult.data?.recipientId?.clientReference || clientReference,
            xeRecipientId: apiResult.data?.recipientId?.xeRecipientId,
            status: "created",
            sheetName,
            rowNumber: row._rowNumber,
            success: true,
            batchId: effectiveBatchId,
          };
          results.push(result);

          // Send progress update via SSE
          if (useSSE) {
            sendSSE(res, "progress", {
              processed: processedCount,
              total: totalRows,
              message: `${processedCount} recipient${processedCount !== 1 ? "s" : ""} created`,
              success: true,
              result,
            });
          }
        } else {
          console.log("❌ Recipient creation failed: ", apiResult?.error || apiResult?.details);
          // Do not store failures
          const result = {
            clientReference,
            xeRecipientId: undefined,
            status: "failed",
            sheetName,
            rowNumber: row._rowNumber,
            success: false,
            error: apiResult.error,
            errorDetails: apiResult.details,
            batchId: effectiveBatchId,
          };
          results.push(result);

          // Send progress update via SSE
          if (useSSE) {
            sendSSE(res, "progress", {
              processed: processedCount,
              total: totalRows,
              message: `${processedCount} recipient${processedCount !== 1 ? "s" : ""} processed`,
              success: false,
              result,
            });
          }
        }
      } catch (error) {
        console.error("Error creating recipient for row:", error);
        processedCount++;

        // Format mongoose validation errors if present
        let formattedErrors = [];
        if (error && error.errors && typeof error.errors === "object") {
          formattedErrors = Object.keys(error.errors).map((key) => {
            const e = error.errors[key];
            return {
              path: e.path || key,
              message: e.message || e.kind || "Validation error",
              value: e.value,
              kind: e.kind,
            };
          });
        }

        const errorObj = {
          sheetName,
          rowNumber: row._rowNumber,
          error: error.message,
          validationErrors: formattedErrors.length ? formattedErrors : undefined,
        };
        errors.push(errorObj);

        // Send progress update via SSE
        if (useSSE) {
          sendSSE(res, "progress", {
            processed: processedCount,
            total: totalRows,
            message: `${processedCount} recipient${processedCount !== 1 ? "s" : ""} processed`,
            success: false,
            error: errorObj,
          });
        }
      }
    }
  }

  const successCount = results.filter((r) => r.success && r.status === "created").length;
  const failureCount = results.length - successCount;

  // If using SSE, send final result and close connection
  if (useSSE) {
    sendSSE(res, "complete", {
      totalProcessed: results.length,
      successCount,
      failureCount,
      results,
      errors,
      batchId: effectiveBatchId,
    });
    res.end();
    return;
  }

  // Normal response for non-SSE requests
  return successResponse(
    res,
    {
      totalProcessed: results.length,
      successCount,
      failureCount,
      results,
      errors,
      batchId: effectiveBatchId,
    },
    `Created ${successCount} recipients, ${failureCount} failed`
  );
});

module.exports = {
  createXeRecipients,
  transformRowToXeRecipient,
  // List recipients with batch-wise pagination and filtering
  listXeRecipients: asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    // Get environment from query, default to sandbox
    let environment = req.query.environment || "sandbox";
    environment = String(environment).trim().toLowerCase();
    if (!["production", "sandbox"].includes(environment)) {
      environment = "sandbox";
    }

    // Build base query for recipients
    const recipientQuery = { environment };
    if (req.query.status) {
      recipientQuery.status = req.query.status;
    }
    if (req.query.search) {
      const search = req.query.search.trim();
      recipientQuery.$or = [
        { "recipientId.clientReference": { $regex: search, $options: "i" } },
        { "recipientId.xeRecipientId": { $regex: search, $options: "i" } },
        { "entity.consumer.givenNames": { $regex: search, $options: "i" } },
        { "entity.consumer.familyName": { $regex: search, $options: "i" } },
        { "entity.company.name": { $regex: search, $options: "i" } },
        { batchId: { $regex: search, $options: "i" } },
      ];
    }

    // Get all unique batchIds that match the query, sorted by most recent recipient creation
    const distinctBatches = await XeRecipient.aggregate([
      { $match: recipientQuery },
      {
        $group: {
          _id: { $ifNull: ["$batchId", "-"] }, // Treat null/undefined batchId as "-"
          latestCreatedAt: { $max: "$createdAt" },
        },
      },
      { $sort: { latestCreatedAt: -1 } },
      { $project: { _id: 1 } },
    ]);

    // Extract batchIds (convert "-" back to null for querying)
    const allBatchIds = distinctBatches.map((b) => (b._id === "-" ? null : b._id));
    const totalBatches = allBatchIds.length;

    // Paginate batchIds
    const paginatedBatchIds = allBatchIds.slice(skip, skip + limit);

    // For each batch, fetch all recipients
    const batchGroups = await Promise.all(
      paginatedBatchIds.map(async (batchId) => {
        // Build query for this specific batch
        // Handle null batchId case separately to avoid query conflicts
        let batchQuery;
        if (batchId === null) {
          // For null batchId, combine recipientQuery with batchId conditions
          batchQuery = {
            ...recipientQuery,
            $and: [
              { $or: [{ batchId: null }, { batchId: { $exists: false } }] }
            ]
          };
          // Remove $or from recipientQuery if it exists, and merge it into $and
          if (recipientQuery.$or) {
            batchQuery.$and = [
              { $or: recipientQuery.$or },
              { $or: [{ batchId: null }, { batchId: { $exists: false } }] }
            ];
            delete batchQuery.$or;
          }
        } else {
          batchQuery = { ...recipientQuery, batchId: batchId };
        }
        
        const batchRecipients = await XeRecipient.find(batchQuery)
          .sort({ createdAt: -1 })
          .lean();

        // Calculate aggregated data for the batch
        const totalAmount = batchRecipients.reduce((sum, r) => sum + (r.amount || 0), 0);
        const createdAt = batchRecipients.length > 0 ? batchRecipients[0].createdAt : null;

        return {
          batchId: batchId,
          recipients: batchRecipients,
          recipientCount: batchRecipients.length,
          totalAmount: totalAmount,
          createdAt: createdAt,
        };
      })
    );

    // Flatten recipients for backward compatibility (frontend groups them anyway)
    const items = batchGroups.flatMap((group) => group.recipients);

    return successResponse(res, {
      items,
      page,
      limit,
      total: items.length, // Total recipients in current page
      totalPages: Math.ceil(totalBatches / limit) || 1,
      batches: totalBatches, // Total number of batches
    });
  }),
  // Generate Excel file with error rows highlighted in red
  generateErrorHighlightedExcel: asyncHandler(async (req, res) => {
    const { sheetRows, results } = req.body;

    if (!Array.isArray(sheetRows) || sheetRows.length === 0) {
      return errorResponse(res, "sheetRows array is required", 400);
    }

    if (!Array.isArray(results)) {
      return errorResponse(res, "results array is required", 400);
    }

    try {
      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();

      // Create a map of failed rows for quick lookup
      const failedRowsMap = new Map();
      results.forEach((result) => {
        if (!result.success || result.status === "failed") {
          const key = `${result.sheetName || ""}_${result.rowNumber || ""}`;
          failedRowsMap.set(key, result);
        }
      });

      // Process each sheet
      for (const sheetInfo of sheetRows) {
        const { sheetName, rows, headers } = sheetInfo;

        if (!Array.isArray(rows) || rows.length === 0) continue;

        const worksheet = workbook.addWorksheet(sheetName);

        // Add headers
        if (headers && headers.length > 0) {
          worksheet.addRow(headers);
          // Style header row
          const headerRow = worksheet.getRow(1);
          headerRow.font = { bold: true };
          headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" },
          };
        }

        // Add data rows
        rows.forEach((row, idx) => {
          const rowNumber = row._rowNumber || idx + 2; // Excel row number (1-indexed, +1 for header)
          const key = `${sheetName}_${rowNumber}`;
          const isErrorRow = failedRowsMap.has(key);

          // Convert row object to array based on headers
          const rowData = headers
            ? headers.map((header) => {
                const normalizedKey = header
                  .toLowerCase()
                  .replace(/\*/g, "")
                  .replace(/\s*\(.*?\)\s*/g, "")
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_+|_+$/g, "");
                return row[normalizedKey] ?? row[header] ?? "";
              })
            : Object.values(row).filter((val) => val !== row._rowNumber);

          const excelRow = worksheet.addRow(rowData);

          // Highlight error rows with red background
          if (isErrorRow) {
            excelRow.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFF0000" }, // Red background
            };
            excelRow.font = { color: { argb: "FFFFFFFF" } }; // White text for contrast
          }
        });

        // Auto-fit columns
        worksheet.columns.forEach((column) => {
          if (column && column.header) {
            column.width = Math.max(column.header.length + 2, 15);
          }
        });
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set headers for file download
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="XE_Recipients_With_Errors_${Date.now()}.xlsx"`
      );

      res.send(buffer);
    } catch (error) {
      console.error("Error generating error-highlighted Excel:", error);
      return errorResponse(res, "Failed to generate Excel file", 500, {
        message: error.message,
      });
    }
  }),

  // Delete a recipient from XE and our DB
  deleteXeRecipient: asyncHandler(async (req, res) => {
    const { xeRecipientId } = req.params;
    if (!xeRecipientId) {
      return errorResponse(res, "xeRecipientId is required", 400);
    }

    // First, fetch the recipient from our database to get its environment
    const recipient = await XeRecipient.findOne({ "recipientId.xeRecipientId": xeRecipientId });
    
    if (!recipient) {
      return errorResponse(res, "Recipient not found in database", 404);
    }

    // Get environment from recipient, request body, query, or default to sandbox
    const environment = recipient?.environment || req.body.environment || req.query.environment || "sandbox";
    const xeService = getXeService(environment);
    const apiResult = await xeService.deleteRecipient(xeRecipientId);

    // If XE says not found, we still delete locally
    if (!apiResult.success && apiResult.statusCode && apiResult.statusCode !== 404) {
      return errorResponse(res, apiResult.error || "Failed to delete recipient in XE", apiResult.statusCode || 400, {
        details: apiResult.details,
      });
    }

    // Remove from our DB
    const deleted = await XeRecipient.findOneAndDelete({ "recipientId.xeRecipientId": xeRecipientId });

    return successResponse(
      res,
      { xeRecipientId, removed: !!deleted, xeDeletion: apiResult.success || apiResult.statusCode === 404 },
      "Recipient deleted"
    );
  }),
};
