const XLSX = require("xlsx");

// Parse Excel/CSV file
function parseExcelFile(buffer, filename) {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (jsonData.length === 0) {
      throw new Error("File is empty");
    }

    // Extract headers and data rows
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);

    // Validate required headers
    const requiredHeaders = ["name", "email", "amount"];
    const normalizedHeaders = headers.map((h) => h.toString().toLowerCase().trim());

    const missingHeaders = requiredHeaders.filter(
      (required) => !normalizedHeaders.some((header) => header.includes(required))
    );

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
    }

    // Create header mapping
    const headerMap = {};
    requiredHeaders.forEach((required) => {
      const index = normalizedHeaders.findIndex((header) => header.includes(required));
      headerMap[required] = index;
    });

    // Add optional headers
    const optionalHeaders = ["notes", "currency"];
    optionalHeaders.forEach((optional) => {
      const index = normalizedHeaders.findIndex((header) => header.includes(optional));
      if (index !== -1) {
        headerMap[optional] = index;
      }
    });

    // Convert rows to objects
    const payments = dataRows
      .filter((row) => row.some((cell) => cell !== "")) // Filter empty rows
      .map((row, index) => {
        const payment = {
          recipientName: (row[headerMap.name] || "").toString().trim(),
          recipientEmail: (row[headerMap.email] || "").toString().trim().toLowerCase(),
          amount: parseFloat(row[headerMap.amount]) || 0,
          currency: headerMap.currency ? (row[headerMap.currency] || "USD").toString().trim() : "USD",
          notes: headerMap.notes ? (row[headerMap.notes] || "").toString().trim() : "",
          rowNumber: index + 2, // +2 because index starts at 0 and we skip header
        };

        return payment;
      });

    return {
      success: true,
      data: payments,
      totalRows: payments.length,
      filename: filename,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      filename: filename,
    };
  }
}

// Validate payment data
function validatePaymentData(payments) {
  const errors = [];
  const validPayments = [];

  payments.forEach((payment, index) => {
    const rowErrors = [];

    // Validate name
    if (!payment.recipientName || payment.recipientName.length < 2) {
      rowErrors.push("Name is required and must be at least 2 characters");
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!payment.recipientEmail || !emailRegex.test(payment.recipientEmail)) {
      rowErrors.push("Valid email address is required");
    }

    // Validate amount
    if (!payment.amount || payment.amount <= 0) {
      rowErrors.push("Amount must be greater than 0");
    }

    if (payment.amount > 10000) {
      rowErrors.push("Amount cannot exceed $10,000 per transaction");
    }

    // Validate currency
    const supportedCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
    if (!supportedCurrencies.includes(payment.currency.toUpperCase())) {
      rowErrors.push(`Currency must be one of: ${supportedCurrencies.join(", ")}`);
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: payment.rowNumber,
        errors: rowErrors,
        data: payment,
      });
    } else {
      validPayments.push({
        ...payment,
        currency: payment.currency.toUpperCase(),
      });
    }
  });

  return {
    validPayments,
    errors,
    totalProcessed: payments.length,
    validCount: validPayments.length,
    errorCount: errors.length,
  };
}

// Generate validation report
function generateValidationReport(validationResult) {
  const { validPayments, errors, totalProcessed, validCount, errorCount } = validationResult;

  const report = {
    summary: {
      totalRows: totalProcessed,
      validRows: validCount,
      errorRows: errorCount,
      totalAmount: validPayments.reduce((sum, payment) => sum + payment.amount, 0),
      currencies: [...new Set(validPayments.map((p) => p.currency))],
    },
    errors: errors,
    isValid: errorCount === 0,
  };

  return report;
}

module.exports = {
  parseExcelFile,
  validatePaymentData,
  generateValidationReport,
};
