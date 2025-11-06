const XLSX = require("xlsx");

/**
 * Build a worksheet and companion instructions sheet for a single selection
 */
function buildXeSheets({ countryCode, currencyCode, numberOfRecipients, paymentFields = [] }) {
  // Define consumer fields (always required)
  const consumerFields = [
    { name: "givenNames", label: "Given Names", required: true, maxLength: 50 },
    { name: "familyName", label: "Family Name", required: true, maxLength: 20 },
    { name: "emailAddress", label: "Email Address", required: false, maxLength: 70 },
    { name: "addressLine1", label: "Address Line 1", required: false, maxLength: 34 },
    { name: "addressLine2", label: "Address Line 2", required: false, maxLength: 34 },
    { name: "addressCountry", label: "Address Country", required: true, maxLength: 2 },
    { name: "locality", label: "Locality (City)", required: false, maxLength: 50 },
    { name: "region", label: "Region (State/Province)", required: false, maxLength: 50 },
    { name: "postcode", label: "Postcode", required: false, maxLength: 20 },
  ];

  // Bank account fields - always include these
  const baseBankFields = [
    { name: "accountName", label: "Account Name", required: true },
    { name: "bankCountry", label: "Bank Country", required: true, maxLength: 2 },
    { name: "accountType", label: "Account Type", required: true },
  ];

  // Map payment fields from API response to column structure
  const dynamicBankFields = paymentFields
    .filter((field) => {
      // Exclude base fields that are always included
      const excludedFields = [
        "accountName",
        "country", // API field for bank country, we include our own bankCountry
        "accountType", // we include a mandatory Account Type column ourselves
        "bankAccountType", // avoid duplicate with Account Type
      ];
      return !excludedFields.includes(field.fieldName);
    })
    .map((field) => ({
      name: field.fieldName,
      label: field.label || field.fieldName,
      required: field.required || false,
      maxLength: field.maximumLength || 0,
      minLength: field.minimumLength || 0,
      pattern: field.pattern || null,
    }));

  // Combine all bank fields
  const allBankFields = [...baseBankFields, ...dynamicBankFields];

  // Add Amount (USD) field - always required, in dollars only
  const amountField = { name: "amount", label: "Amount (USD)", required: true };

  // Create header row (mark ALL columns as required with *)
  const headers = [
    ...consumerFields.map((f) => `${f.label} *`),
    ...allBankFields.map((f) => `${f.label} *`),
    `${amountField.label} *`,
  ];

  // Create data rows (empty rows for user to fill)
  const dataRows = [];
  for (let i = 0; i < numberOfRecipients; i++) {
    const row = new Array(headers.length).fill("");
    dataRows.push(row);
  }

  // Combine headers and data
  const worksheetData = [headers, ...dataRows];

  // Create worksheet from data
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const columnWidths = headers.map((header, index) => {
    // Calculate width based on header length and field type
    const fieldIndex = index < consumerFields.length ? index : index - consumerFields.length;
    const fields = index < consumerFields.length ? consumerFields : allBankFields;
    const field = fields[fieldIndex];
    const maxLength = field?.maxLength || 20;
    return { wch: Math.max(header.length + 2, Math.min(maxLength + 2, 30)) };
  });
  worksheet["!cols"] = columnWidths;

  // Force text format for identifier-like columns to preserve leading zeros
  try {
    const TEXT_LABELS = new Set([
      "Account Number",
      "Postcode",
      "Postal Code",
      "NCC",
      "IFSC",
      "Routing Number",
      "BIC",
      "IBAN",
    ]);

    const plainHeader = (h) => h.replace(/\s*\*\s*$/, "");
    const colsToText = headers
      .map((h, idx) => ({ h: plainHeader(h), idx }))
      .filter(({ h }) => TEXT_LABELS.has(h))
      .map(({ idx }) => idx);

    if (colsToText.length > 0) {
      // Apply text format to all data cells in those columns
      for (let r = 1; r <= numberOfRecipients; r++) {
        for (const c of colsToText) {
          const addr = XLSX.utils.encode_cell({ c, r });
          const cell = worksheet[addr] || { v: "" };
          cell.t = "s"; // string cell
          cell.z = "@"; // text format
          worksheet[addr] = cell;
        }
      }
    }
  } catch {}

  // Note: XLSX library has limited styling support
  // Freeze panes and auto-filters require additional configuration
  // For better Excel features, consider using exceljs or similar libraries

  // Create instructions sheet
  const instructionsData = [
    ["XE Bank Transfer Template Instructions"],
    [""],
    [`Generated for: ${countryCode} / ${currencyCode}`],
    [`Number of recipients: ${numberOfRecipients}`],
    [`Generated on: ${new Date().toISOString()}`],
    [""],
    ["CONSUMER FIELDS (Required for all recipients):"],
    [""],
    ...consumerFields.map((f) => [`${f.label} *REQUIRED`, `Max length: ${f.maxLength} characters`]),
    [""],
    ["BANK ACCOUNT FIELDS:"],
    [""],
    ...allBankFields.map((f) => [
      `${f.label} *REQUIRED`,
      f.maxLength ? `Max length: ${f.maxLength} characters` : "",
      f.minLength ? `Min length: ${f.minLength} characters` : "",
      f.pattern ? `Pattern: ${f.pattern}` : "",
    ]),
    [""],
    ["PAYMENT AMOUNT:"],
    [""],
    ["Amount (USD) *REQUIRED", "Payment amount in US Dollars only"],
    [""],
    ["INSTRUCTIONS:"],
    ["1. Fill in all required fields (marked with *)"],
    ["2. Ensure country codes are 2-character ISO codes (e.g., GB, US, IN)"],
    ["3. Address fields are optional but recommended"],
    ["4. Bank account details must match the selected country/currency requirements"],
    ["5. Save the file and upload it through the Upload Excel tab"],
    [""],
    ["FIELD CONSTRAINTS:"],
    ["- Given Names: Space separated list, max 50 characters"],
    ["- Family Name: Single surname, max 20 characters"],
    ["- Email: Valid email format, max 70 characters"],
    ["- Address: Line 1 and Line 2, max 34 characters each"],
    ["- Country: 2-character ISO 3166-1-alpha-2 code"],
    ["- Locality: City name, max 50 characters"],
    ["- Region: State/Province, max 50 characters"],
    ["- Postcode: Postal code, max 20 characters"],
    ["- Amount (USD): Payment amount in US Dollars only, required for all recipients"],
    [""],
    ["STATE/REGION VALIDATION - IMPORTANT:"],
    [""],
    ["⚠️ Some countries require ISO state/region codes, while others accept full state names."],
    [""],
    ["Countries Requiring ISO Codes (2-letter codes):"],
    ["  🇺🇸 US, 🇬🇧 GB, 🇦🇺 AU, 🇨🇳 CN, 🇲🇽 MX, 🇳🇿 NZ, 🇨🇦 CA"],
    [""],
    ["Countries Accepting Full State Names:"],
    ["  🇮🇳 India (e.g., Maharashtra, Karnataka, Tamil Nadu)"],
    [""],
    ["Examples:"],
    ["  ✅ US → CA (California) - CORRECT"],
    ["  ❌ US → California - INCORRECT (must use ISO code)"],
    ["  ✅ GB → EN (England) - CORRECT"],
    ["  ❌ GB → England - INCORRECT (must use ISO code)"],
    ["  ✅ IN → Maharashtra - CORRECT (full name accepted)"],
    ["  ✅ AU → NSW (New South Wales) - CORRECT"],
    ["  ❌ AU → New South Wales - INCORRECT (must use ISO code)"],
    [""],
    ["Note: For countries requiring ISO codes, use 2-letter state/region codes only."],
    ["For countries like India, you can use the full state name."],
  ];

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsSheet["!cols"] = [{ wch: 50 }, { wch: 60 }];

  return { worksheet, instructionsSheet, sheetName: `${countryCode}_${currencyCode}` };
}

module.exports = {
  /**
   * Generate a single-file template (kept for backward compatibility)
   */
  generateXeTemplate({ countryCode, currencyCode, numberOfRecipients, paymentFields = [] }) {
    const { worksheet, instructionsSheet, sheetName } = buildXeSheets({
      countryCode,
      currencyCode,
      numberOfRecipients,
      paymentFields,
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, `${sheetName}_Instructions`);

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  },

  /**
   * Generate a workbook containing multiple country/currency selections.
   * selections: Array<{countryCode, currencyCode, numberOfRecipients, paymentFields}>
   */
  generateXeWorkbookForSelections(selections = []) {
    const workbook = XLSX.utils.book_new();
    selections.forEach((sel) => {
      const { worksheet, instructionsSheet, sheetName } = buildXeSheets(sel);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, `${sheetName}_Instructions`);
    });
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  },
};
