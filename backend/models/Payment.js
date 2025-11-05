const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // Recipient information
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      default: "USD",
    },
    notes: {
      type: String,
      trim: true,
    },

    // Payment method
    paymentMethod: {
      type: String,
      required: true,
      enum: ["paypal", "giftogram", "xe_bank_transfer"],
      default: "paypal",
    },

    // Payment status
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
    },

    // PayPal transaction details
    paypalPayoutBatchId: {
      type: String,
    },
    paypalPayoutItemId: {
      type: String,
    },
    transactionId: {
      type: String,
    },
    paypalTransactionStatus: {
      type: String,
    },

    // Giftogram transaction details
    giftogramOrderId: {
      type: String,
    },
    giftogramExternalId: {
      type: String,
    },
    giftogramCampaignId: {
      type: String,
    },
    giftogramMessage: {
      type: String,
    },
    giftogramStatus: {
      type: String,
    },

    // XE Bank Transfer details
    xeRecipientId: {
      type: String,
    },
    xePaymentId: {
      type: String,
    },
    xeAccountNumber: {
      type: String,
    },
    xeStatus: {
      type: String,
    },
    xeBankDetails: {
      type: mongoose.Schema.Types.Mixed,
    },
    xeCountryCode: {
      type: String,
    },
    xeCurrencyCode: {
      type: String,
    },

    // Batch information
    batchId: {
      type: String,
      required: true,
    },
    batchName: {
      type: String,
    },

    // Error handling
    errorMessage: {
      type: String,
    },
    errorCode: {
      type: String,
    },

    // Timestamps
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },

    // Audit fields
    createdBy: {
      type: String,
      default: "system",
    },
    ipAddress: {
      type: String,
    },

    // Environment tracking
    environment: {
      type: String,
      enum: ["production", "sandbox"],
      default: "sandbox",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ batchId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ recipientEmail: 1 });
paymentSchema.index({ createdAt: -1 });

// Instance methods
paymentSchema.methods.updateStatus = function (status, additionalData = {}) {
  this.status = status;

  if (status === "processing") {
    this.processedAt = new Date();
  } else if (status === "completed") {
    this.completedAt = new Date();
  }

  // Update additional fields if provided
  Object.assign(this, additionalData);

  return this.save();
};

// Static methods
paymentSchema.statics.findByBatch = function (batchId) {
  return this.find({ batchId }).sort({ createdAt: -1 });
};

paymentSchema.statics.getPaymentStats = function (batchId = null) {
  const match = batchId ? { batchId } : {};

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);
};

module.exports = mongoose.model("Payment", paymentSchema);
