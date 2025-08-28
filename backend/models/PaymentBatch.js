const mongoose = require("mongoose");

const paymentBatchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // Batch statistics
    totalPayments: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },

    // Batch status
    status: {
      type: String,
      enum: ["draft", "uploaded", "processing", "completed", "failed", "partial"],
      default: "draft",
    },

    // PayPal batch details
    paypalPayoutBatchId: {
      type: String,
    },
    paypalBatchStatus: {
      type: String,
    },

    // File information
    originalFileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },

    // Processing results
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    pendingCount: {
      type: Number,
      default: 0,
    },

    // Timestamps
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },

    // Error handling
    errorMessage: {
      type: String,
    },

    // Audit fields
    createdBy: {
      type: String,
      default: "system",
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentBatchSchema.index({ status: 1 });
paymentBatchSchema.index({ createdAt: -1 });
paymentBatchSchema.index({ batchId: 1 }, { unique: true });

// Instance methods
paymentBatchSchema.methods.updateCounts = async function () {
  const Payment = mongoose.model("Payment");

  const stats = await Payment.aggregate([
    { $match: { batchId: this.batchId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  // Reset counts
  this.successCount = 0;
  this.failureCount = 0;
  this.pendingCount = 0;
  this.totalAmount = 0;

  stats.forEach((stat) => {
    if (stat._id === "completed") {
      this.successCount = stat.count;
      this.totalAmount += stat.totalAmount;
    } else if (stat._id === "failed") {
      this.failureCount = stat.count;
    } else {
      this.pendingCount += stat.count;
    }
  });

  // Update batch status based on payment statuses
  if (this.successCount === this.totalPayments) {
    this.status = "completed";
    this.completedAt = new Date();
  } else if (this.failureCount === this.totalPayments) {
    this.status = "failed";
  } else if (this.successCount > 0 || this.failureCount > 0) {
    this.status = "partial";
  }

  return this.save();
};

// Static methods
paymentBatchSchema.statics.generateBatchId = function () {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `batch_${timestamp}_${random}`;
};

module.exports = mongoose.model("PaymentBatch", paymentBatchSchema);
