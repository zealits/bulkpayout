const express = require("express");
const {
  getGiftogramCampaigns,
  processGiftogramBatch,
  syncGiftogramBatch,
  getGiftogramFunding,
  testGiftogramConnection,
} = require("../controllers/giftogramController");

const router = express.Router();

// Campaign routes
router.get("/campaigns", getGiftogramCampaigns);

// Account routes
router.get("/funding", getGiftogramFunding);

// Batch processing routes
router.post("/batches/:batchId/process", processGiftogramBatch);
router.post("/batches/:batchId/sync", syncGiftogramBatch);

// Test routes
router.get("/test", testGiftogramConnection);

module.exports = router;
