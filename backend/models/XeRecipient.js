const mongoose = require("mongoose");

const xeRecipientSchema = new mongoose.Schema(
  {
    // Only persist the successful XE response shape
    payoutMethod: {
      type: {
        type: String,
        enum: ["BankAccount"],
        default: "BankAccount",
      },
      bank: {
        account: {
          accountName: { type: String },
          accountNumber: { type: String },
          bic: { type: String },
          ncc: { type: String },
          iban: { type: String },
          country: { type: String, maxLength: 2 },
          accountType: { type: String },
        },
        intermAccount: {
          accountName: { type: String },
          accountNumber: { type: String },
          bic: { type: String },
          ncc: { type: String },
          iban: { type: String },
          country: { type: String, maxLength: 2 },
        },
      },
    },

    entity: {
      type: {
        type: String,
        enum: ["Consumer", "Company"],
      },
      company: {
        name: { type: String },
        address: {
          line1: { type: String },
          line2: { type: String },
          country: { type: String, maxLength: 2 },
          locality: { type: String },
          region: { type: String },
          postcode: { type: String },
        },
        industryTypeCode: { type: String },
        emailAddress: { type: String },
        idCountry: { type: String },
        idType: { type: String },
        idNumber: { type: String },
        taxNumber: { type: String },
        phoneNumber: { type: String },
      },
      consumer: {
        givenNames: { type: String },
        familyName: { type: String },
        emailAddress: { type: String },
        address: {
          line1: { type: String },
          line2: { type: String },
          country: { type: String, maxLength: 2 },
          locality: { type: String },
          region: { type: String },
          postcode: { type: String },
        },
        title: { type: String },
        idCountry: { type: String },
        idType: { type: String },
        idNumber: { type: String },
        taxNumber: { type: String },
        phoneNumber: { type: String },
      },
      isDeactivated: { type: Boolean, default: false },
    },

    recipientId: {
      xeRecipientId: { type: String, index: true },
      clientReference: { type: String, index: true },
    },

    currency: { type: String, maxLength: 3 },

    // Batch identifier for grouping recipients created from a single Excel upload
    batchId: { type: String, index: true },

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
    strict: true,
  }
);

// Static method to generate unique client reference
xeRecipientSchema.statics.generateClientReference = function (prefix = "XE") {
  // Allowed chars per XE regex: space, a-zA-Z0-9, , . : ' + ( ) ? - / & @
  // Format: XE-YYMMDDHHmmss-RANDOM6 (max length <= 35)
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  const y = now.getUTCFullYear().toString().slice(-2);
  const M = pad(now.getUTCMonth() + 1);
  const d = pad(now.getUTCDate());
  const h = pad(now.getUTCHours());
  const m = pad(now.getUTCMinutes());
  const s = pad(now.getUTCSeconds());
  const timestamp = `${y}${M}${d}${h}${m}${s}`; // 12 chars

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // allowed
  let rand = "";
  for (let i = 0; i < 6; i++) {
    rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `${prefix}-${timestamp}-${rand}`; // e.g., XE-250930101530-AB12CD (~22-24 chars)
};

module.exports = mongoose.model("XeRecipient", xeRecipientSchema);
