const express = require("express");
const {
  getGiftogramCampaigns,
  processGiftogramBatch,
  processGiftogramBatchStream,
  syncGiftogramBatch,
  getGiftogramFunding,
  testGiftogramConnection,
} = require("../controllers/giftogramController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Protect all routes - only admins can access
router.use(protect);
router.use(authorize("admin"));

// Campaign routes
router.get("/campaigns", getGiftogramCampaigns);

// Account routes
router.get("/funding", getGiftogramFunding);

// Batch processing routes
router.post("/batches/:batchId/process", processGiftogramBatch);
router.post("/batches/:batchId/process-stream", processGiftogramBatchStream);
router.post("/batches/:batchId/sync", syncGiftogramBatch);

// Test routes
router.get("/test", testGiftogramConnection);

module.exports = router;
