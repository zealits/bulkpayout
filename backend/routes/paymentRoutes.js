const express = require("express");
const {
  getPaymentBatches,
  getPaymentBatch,
  getPaymentsByBatch,
  processPaymentBatch,
  getPaymentStats,
  getDashboardStats,
  updateBatchPaymentMethod,
  updatePaymentStatus,
  syncWithPayPal,
  getAccountBalance,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Protect all routes - only admins can access
router.use(protect);
router.use(authorize("admin"));

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
router.get("/dashboard-stats", getDashboardStats);

// Account routes
router.get("/account/balance", getAccountBalance);

module.exports = router;
