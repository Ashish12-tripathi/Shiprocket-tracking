const mongoose = require("mongoose");

const abandonedMessageAttributedConversionSchema = new mongoose.Schema(
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

    attributionType: {
      type: String,
      default: "abandoned_message",
      index: true,
    },

    lastMessageNumberBeforeConversion: {
      type: Number,
      index: true,
    },

    lastMessageSentAt: Date,

    message1Sent: Boolean,
    message2Sent: Boolean,
    message3Sent: Boolean,

    message1SentAt: Date,
    message2SentAt: Date,
    message3SentAt: Date,

    abandonedMessageAttribution: Object,

    campaignAttribution: Object,

    utmId: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,

    optOut: {
      type: Boolean,
      default: false,
    },

    rawOrder: Object,

    syncedAt: Date,
  },
  {
    timestamps: true,
    collection: "abandoned_message_attributed_conversions",
  }
);

abandonedMessageAttributedConversionSchema.index({
  lastMessageNumberBeforeConversion: 1,
  lastConvertedAt: -1,
});

abandonedMessageAttributedConversionSchema.index({
  phoneE164: 1,
  lastConvertedAt: -1,
});

module.exports = mongoose.model(
  "AbandonedMessageAttributedConversion",
  abandonedMessageAttributedConversionSchema
);