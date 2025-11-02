const asyncHandler = require("../middleware/asyncHandler");
const XeRecipient = require("../models/XeRecipient");
const xeService = require("../services/xeService");
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
    },
  };
}

// @desc    Create XE recipients from uploaded Excel data
// @route   POST /api/xe/create-recipients
// @access  Public
const createXeRecipients = asyncHandler(async (req, res) => {
  const { sheetRows, batchId } = req.body; // Array of { sheetName, rows, inferredCountry, inferredCurrency }

  if (!Array.isArray(sheetRows) || sheetRows.length === 0) {
    return errorResponse(res, "sheetRows array is required", 400);
  }

  const results = [];
  const errors = [];

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

  for (const sheetInfo of sheetRows) {
    const { sheetName, rows, inferredCountry, inferredCurrency } = sheetInfo;

    if (!Array.isArray(rows) || rows.length === 0) continue;

    for (const row of rows) {
      try {
        // Generate unique client reference
        let clientReference = XeRecipient.generateClientReference();

        // Transform row to XE format
        const { recipientData, accountNumber, extractedData } = transformRowToXeRecipient(row, {
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
        const apiResult = await xeService.createRecipient(recipientData);
        // console.log("📦 apiResult:", apiResult);
        // console.log("📄 apiResult.data:", apiResult?.data);

        if (apiResult.success && apiResult.statusCode === 200 && apiResult.data) {
          // Persist only the successful response fields
          // Shape expected by schema: { payoutMethod, entity, recipientId, currency }
          const toSave = {
            payoutMethod: apiResult.data.payoutMethod,
            entity: apiResult.data.entity,
            recipientId: apiResult.data.recipientId,
            currency: apiResult.data.currency,
            batchId: effectiveBatchId,
          };

          console.log("📝 xeRecipient (success, to be saved):", toSave);
          const xeRecipient = new XeRecipient(toSave);
          await xeRecipient.save();

          results.push({
            clientReference: apiResult.data?.recipientId?.clientReference || clientReference,
            xeRecipientId: apiResult.data?.recipientId?.xeRecipientId,
            status: "created",
            sheetName,
            rowNumber: row._rowNumber,
            success: true,
            batchId: effectiveBatchId,
          });
        } else {
          console.log("❌ Recipient creation failed: ", apiResult?.error || apiResult?.details);
          // Do not store failures
          results.push({
            clientReference,
            xeRecipientId: undefined,
            status: "failed",
            sheetName,
            rowNumber: row._rowNumber,
            success: false,
            error: apiResult.error,
            errorDetails: apiResult.details,
            batchId: effectiveBatchId,
          });
        }
      } catch (error) {
        console.error("Error creating recipient for row:", error);

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

        errors.push({
          sheetName,
          rowNumber: row._rowNumber,
          error: error.message,
          validationErrors: formattedErrors.length ? formattedErrors : undefined,
        });
      }
    }
  }

  const successCount = results.filter((r) => r.success && r.status === "created").length;
  const failureCount = results.length - successCount;

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
  // List recipients with simple pagination and filtering
  listXeRecipients: asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { "recipientId.clientReference": { $regex: search, $options: "i" } },
        { "recipientId.xeRecipientId": { $regex: search, $options: "i" } },
        { "entity.consumer.givenNames": { $regex: search, $options: "i" } },
        { "entity.consumer.familyName": { $regex: search, $options: "i" } },
        { "entity.company.name": { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      XeRecipient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      XeRecipient.countDocuments(query),
    ]);

    return successResponse(res, {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  }),
  // Delete a recipient from XE and our DB
  deleteXeRecipient: asyncHandler(async (req, res) => {
    const { xeRecipientId } = req.params;
    if (!xeRecipientId) {
      return errorResponse(res, "xeRecipientId is required", 400);
    }

    // Attempt XE deletion first
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
