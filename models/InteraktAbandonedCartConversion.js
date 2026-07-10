const mongoose = require("mongoose");

const interaktAbandonedCartConversionSchema = new mongoose.Schema(
  {
    customerKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    convertedCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConvertedCustomer",
      index: true,
    },

    phoneE164: {
      type: String,
      index: true,
    },

    phoneNumber: String,

    countryCode: {
      type: String,
      default: "+91",
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },

    customerName: String,

    totalOrders: {
      type: Number,
      default: 0,
    },

    totalSpent: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    firstConvertedAt: Date,
    lastConvertedAt: Date,

    lastOrderId: String,
    lastOrderName: String,
    lastOrderAt: Date,

    lastProductName: String,
    lastCartValue: Number,
    lastCheckoutUrl: String,
    lastMatchedCartId: String,

    sourceCartIds: {
      type: [String],
      default: [],
    },

    campaignKey: {
      type: String,
      default: "monsoon_abandoned_carts_tillnow_2026",
      index: true,
    },

    templateName: {
      type: String,
      default: "abandoned_cart_tillnow",
      index: true,
    },

    audienceType: {
      type: String,
      default: "abandoned_cart",
      index: true,
    },

    utmId: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,

    matchedBy: {
      type: String,
      enum: ["utm", "campaignAttribution", "manual_backfill"],
      default: "utm",
    },

    optOut: {
      type: Boolean,
      default: false,
    },

    rawOrder: Object,
  },
  {
    timestamps: true,
    collection: "interakt_abandoned_cart_conversions",
  }
);

interaktAbandonedCartConversionSchema.index({ lastConvertedAt: -1 });
interaktAbandonedCartConversionSchema.index({ totalOrders: -1 });
interaktAbandonedCartConversionSchema.index({
  utmSource: 1,
  utmMedium: 1,
  utmCampaign: 1,
});

module.exports = mongoose.model(
  "InteraktAbandonedCartConversion",
  interaktAbandonedCartConversionSchema
);