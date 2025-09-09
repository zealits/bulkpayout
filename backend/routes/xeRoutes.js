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
} = require("../controllers/xeController");

const router = express.Router();

// Test XE API connection
router.get("/test", testXeConnection);

// Get XE accounts
router.get("/accounts", getXeAccounts);

// Get payment fields for country and currency
router.get("/payment-fields/:countryCode/:currencyCode", getPaymentFields);

// Create XE recipient
router.post("/recipients", createXeRecipient);

// Create XE payment
router.post("/payments", createXePayment);

// Get XE payment status
router.get("/payments/:paymentId/status", getXePaymentStatus);

// Process XE batch
router.post("/batches/:batchId/process", processXeBatch);

// Get supported countries and currencies
router.get("/countries", getSupportedCountriesAndCurrencies);

module.exports = router;
