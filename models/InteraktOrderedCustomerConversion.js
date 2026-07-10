const mongoose = require("mongoose");

const interaktOrderedCustomerConversionSchema = new mongoose.Schema(
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
      default: "monsoon_ordered_customers_tilljune2026",
      index: true,
    },

    templateName: {
      type: String,
      default: "orderplacedcustomertilljune",
      index: true,
    },

    audienceType: {
      type: String,
      default: "converted_customer",
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
    collection: "interakt_ordered_customer_conversions",
  }
);

interaktOrderedCustomerConversionSchema.index({ lastConvertedAt: -1 });
interaktOrderedCustomerConversionSchema.index({ totalOrders: -1 });
interaktOrderedCustomerConversionSchema.index({
  utmSource: 1,
  utmMedium: 1,
  utmCampaign: 1,
});

module.exports = mongoose.model(
  "InteraktOrderedCustomerConversion",
  interaktOrderedCustomerConversionSchema
);