const mongoose = require("mongoose");

const convertedCustomerSchema = new mongoose.Schema(
  {
    customerKey: {
      type: String,
      required: true,
      unique: true,
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

    abandonedMessageAttribution: {
      message1Sent: Boolean,
      message2Sent: Boolean,
      message3Sent: Boolean,
      message1SentAt: Date,
      message2SentAt: Date,
      message3SentAt: Date,
      lastMessageNumberBeforeConversion: Number,
      lastMessageSentAt: Date,
    },

    campaignAttribution: {
      recentCampaignKeys: {
        type: [String],
        default: [],
      },
      recentTemplates: {
        type: [String],
        default: [],
      },
      recentAudienceTypes: {
        type: [String],
        default: [],
      },
    },

    utmSource: String,
    utmMedium: String,
    utmCampaign: String,

    optOut: {
      type: Boolean,
      default: false,
    },

    rawOrder: Object,
  },
  {
    timestamps: true,
  }
);

convertedCustomerSchema.index({ lastConvertedAt: -1 });
convertedCustomerSchema.index({ totalOrders: -1 });
convertedCustomerSchema.index({ utmSource: 1, utmMedium: 1, utmCampaign: 1 });

module.exports = mongoose.model("ConvertedCustomer", convertedCustomerSchema);