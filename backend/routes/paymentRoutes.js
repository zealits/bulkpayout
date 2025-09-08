const express = require("express");
const {
  getPaymentBatches,
  getPaymentBatch,
  getPaymentsByBatch,
  processPaymentBatch,
  getPaymentStats,
  updateBatchPaymentMethod,
  updatePaymentStatus,
  syncWithPayPal,
  getAccountBalance,
} = require("../controllers/paymentController");

const router = express.Router();

// Batch routes
router.get("/batches", getPaymentBatches);
router.get("/batches/:batchId", getPaymentBatch);
router.get("/batches/:batchId/payments", getPaymentsByBatch);
router.put("/batches/:batchId/payment-method", updateBatchPaymentMethod);
router.post("/batches/:batchId/process", processPaymentBatch);
router.post("/batches/:batchId/sync", syncWithPayPal);

// Payment routes
router.put("/:paymentId/status", updatePaymentStatus);

// Statistics routes
router.get("/stats", getPaymentStats);

// Account routes
router.get("/account/balance", getAccountBalance);

module.exports = router;
