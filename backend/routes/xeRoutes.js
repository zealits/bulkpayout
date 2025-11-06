const express = require("express");
const {
  testXeConnection,
  getXeAccounts,
  getPaymentFields,
  createXeRecipient,
  createXePayment,
  getXePaymentStatus,
  processXeBatch,
  getSupportedCountriesAndCurrencies,
  generateXeExcelTemplate,
  generateXeExcelTemplatesBulk,
  parseXeTemplate,
  createXeContract,
  approveXeContract,
  cancelXeContract,
  getXeContract,
  getXeContractDetails,
  getXeContractsByRecipient,
  getAllXeContracts,
} = require("../controllers/xeController");
const { createXeRecipients, listXeRecipients, deleteXeRecipient, generateErrorHighlightedExcel } = require("../controllers/xeRecipientController");
const { protect, authorize } = require("../middleware/auth");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Protect all routes - only admins can access
router.use(protect);
router.use(authorize("admin"));

// Test XE API connection
router.get("/test", testXeConnection);

// Get XE accounts
router.get("/accounts", getXeAccounts);

// Get payment fields for country and currency
router.get("/payment-fields/:countryCode/:currencyCode", getPaymentFields);

// Create XE recipient
router.post("/recipients", createXeRecipient);

// List XE recipients
router.get("/recipients", listXeRecipients);

// Delete XE recipient
router.delete("/recipients/:xeRecipientId", deleteXeRecipient);

// Create XE payment
router.post("/payments", createXePayment);

// Get XE payment status
router.get("/payments/:paymentId/status", getXePaymentStatus);

// Process XE batch
router.post("/batches/:batchId/process", processXeBatch);

// Get supported countries and currencies
router.get("/countries", getSupportedCountriesAndCurrencies);

// Generate XE Excel template
router.post("/generate-template", generateXeExcelTemplate);

// Generate multiple XE Excel templates (multi-sheet)
router.post("/generate-template-bulk", generateXeExcelTemplatesBulk);

// Parse uploaded XE workbook (multi-sheet reader)
router.post("/parse-template", upload.single("file"), parseXeTemplate);

// Create XE recipients from parsed Excel data
router.post("/create-recipients", createXeRecipients);

// Generate Excel file with error rows highlighted
router.post("/generate-error-excel", generateErrorHighlightedExcel);

// Create XE contract
router.post("/contracts", createXeContract);

// Get all XE contracts
router.get("/contracts", getAllXeContracts);

// Approve XE contract
router.post("/contracts/:contractNumber/approve", approveXeContract);

// Cancel/Delete XE contract
router.delete("/contracts/:contractNumber", cancelXeContract);

// Get XE contract by contract number
router.get("/contracts/:contractNumber", getXeContract);

// Get XE contract details from XE API
router.get("/contracts/:contractNumber/details", getXeContractDetails);

// Get XE contracts for a recipient
router.get("/recipients/:xeRecipientId/contracts", getXeContractsByRecipient);

module.exports = router;
