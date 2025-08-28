const express = require("express");
const multer = require("multer");
const {
  uploadExcel,
  validateExcel,
  getUploadTemplate,
  deleteUploadedBatch,
  updateBatch,
} = require("../controllers/uploadController");

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel and CSV files
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
      "application/csv",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed."), false);
    }
  },
});

// Upload routes
router.post("/excel", upload.single("file"), uploadExcel);
router.post("/validate", upload.single("file"), validateExcel);
router.get("/template", getUploadTemplate);

// Batch management routes
router.delete("/batches/:batchId", deleteUploadedBatch);
router.put("/batches/:batchId", updateBatch);

module.exports = router;
