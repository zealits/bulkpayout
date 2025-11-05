const mongoose = require("mongoose");

const paymentFieldSchema = new mongoose.Schema(
  {
    // Country and currency combination
    countryCode: {
      type: String,
      required: true,
      uppercase: true,
      minLength: 2,
      maxLength: 2,
    },
    currencyCode: {
      type: String,
      required: true,
      uppercase: true,
      minLength: 3,
      maxLength: 3,
    },

    // Payment fields from XE API
    fields: [
      {
        fieldName: {
          type: String,
          required: true,
        },
        label: {
          type: String,
          required: true,
        },
        required: {
          type: Boolean,
          default: false,
        },
        pattern: {
          type: String,
          default: null,
        },
        minimumLength: {
          type: Number,
          default: 0,
        },
        maximumLength: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Metadata
    lastFetched: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      // Fields expire after 30 days, refresh if needed
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },

    // Source information
    source: {
      type: String,
      default: "xe_api",
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for country and currency combination
paymentFieldSchema.index({ countryCode: 1, currencyCode: 1 }, { unique: true });

// Index for querying by expiration
paymentFieldSchema.index({ expiresAt: 1 });

// Static method to find or create payment fields
paymentFieldSchema.statics.findOrCreate = async function (countryCode, currencyCode, fields) {
  const existing = await this.findOne({ countryCode, currencyCode });

  if (existing) {
    // Update fields and expiration
    existing.fields = fields;
    existing.lastFetched = new Date();
    existing.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await existing.save();
    return existing;
  }

  // Create new entry
  return await this.create({
    countryCode,
    currencyCode,
    fields,
    lastFetched: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
};

// Instance method to check if fields are expired
paymentFieldSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model("PaymentField", paymentFieldSchema);









