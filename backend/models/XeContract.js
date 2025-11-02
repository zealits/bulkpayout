const mongoose = require("mongoose");

const xeContractSchema = new mongoose.Schema(
  {
    // Contract identifier
    identifier: {
      contractNumber: { type: String, index: true },
      clientTransferNumber: { type: String, index: true },
    },

    // Related recipient
    recipientId: {
      xeRecipientId: { type: String, required: true, index: true },
      clientReference: { type: String, index: true },
    },

    // Contract details
    createdDate: { type: Date, default: Date.now },
    status: {
      type: String,
      default: "QuoteRequired",
      index: true,
    },

    // Quote information
    quote: {
      fxDetails: [
        {
          sell: {
            currency: { type: String },
            amount: { type: Number },
          },
          remainingSellForward: {
            currency: { type: String },
            amount: { type: Number },
          },
          buy: {
            currency: { type: String },
            amount: { type: Number },
          },
          remainingBuyForward: {
            currency: { type: String },
            amount: { type: Number },
          },
          rate: {
            sellCurrency: { type: String },
            buyCurrency: { type: String },
            rate: { type: Number },
            baseCurrency: { type: String },
            inverseRate: { type: Number },
          },
          valueDate: { type: Date },
          quoteType: { type: String },
          remainingToDisburse: {
            currency: { type: String },
            amount: { type: Number },
          },
        },
      ],
      quoteTime: { type: Date },
      expires: { type: Date, index: true }, // For countdown timer
    },

    // Settlement options
    settlementOptions: [
      {
        method: { type: String },
        isAvailable: { type: Boolean },
        displayName: { type: String },
        unAvailableReason: { type: String },
        unAvailableReasonCode: { type: String },
      },
    ],

    deliveryMethod: { type: String },

    // Summary information
    summary: [
      {
        settlementDate: { type: Date },
        xeBankAccount: {
          accountName: { type: String },
          accountNumber: { type: String },
          bic: { type: String },
          ncc: { type: String },
          iban: { type: String },
          country: { type: String },
          accountType: { type: String },
        },
        settlementMethod: { type: String },
        directDebitBankAccount: {
          accountName: { type: String },
          accountNumber: { type: String },
        },
        settlementFees: {
          currency: { type: String },
          amount: { type: Number },
        },
        settlementAmount: {
          currency: { type: String },
          amount: { type: Number },
        },
        initialMargin: {
          currency: { type: String },
          amount: { type: Number },
        },
        remainingSettlement: {
          currency: { type: String },
          amount: { type: Number },
          valueDate: { type: Date },
        },
      },
    ],

    settlementStatus: {
      type: String,
      enum: ["NotSettled", "Settled", "PartiallySettled"],
      default: "NotSettled",
    },

    quoteStatus: {
      type: String,
      default: "NotSet",
    },

    contractType: {
      type: String,
      enum: ["NotSpecified", "Spot", "Forward"],
      default: "NotSpecified",
    },

    // Payment request details (what was sent)
    paymentRequest: {
      clientReference: { type: String },
      sellAmount: {
        currency: { type: String },
        amount: { type: Number },
      },
      buyAmount: {
        currency: { type: String },
      },
      purposeOfPaymentCode: { type: String },
    },

    // Approval information
    approvedAt: { type: Date },
    approvedBy: { type: String },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Index for efficient queries
xeContractSchema.index({ "recipientId.xeRecipientId": 1, createdAt: -1 });
xeContractSchema.index({ status: 1, "quote.expires": 1 });

module.exports = mongoose.model("XeContract", xeContractSchema);
